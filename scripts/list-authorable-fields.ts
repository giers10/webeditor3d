import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

interface AuthorableRoot {
  title: string;
  file: string;
  typeName: string;
  path: string;
  skipProperties?: readonly string[];
}

interface FieldEntry {
  path: string;
  condition: string | null;
}

const ROOTS: readonly AuthorableRoot[] = [
  {
    title: "Project",
    file: "src/document/scene-document.ts",
    typeName: "ProjectDocument",
    path: "project",
    skipProperties: [
      "version",
      "time",
      "scheduler",
      "sequences",
      "scenes",
      "materials",
      "textures",
      "assets"
    ]
  },
  {
    title: "Project Time",
    file: "src/document/project-time-settings.ts",
    typeName: "ProjectTimeSettings",
    path: "project.time"
  },
  {
    title: "Schedule Routine",
    file: "src/scheduler/project-scheduler.ts",
    typeName: "ProjectScheduleRoutine",
    path: "project.scheduler.routines[]"
  },
  {
    title: "Sequence",
    file: "src/sequencer/project-sequences.ts",
    typeName: "ProjectSequence",
    path: "project.sequences[]"
  },
  {
    title: "Scene",
    file: "src/document/scene-document.ts",
    typeName: "ProjectScene",
    path: "scene",
    skipProperties: [
      "editorPreferences",
      "world",
      "brushes",
      "terrains",
      "paths",
      "modelInstances",
      "entities",
      "interactionLinks"
    ]
  },
  {
    title: "Scene Editor Preferences",
    file: "src/document/scene-document.ts",
    typeName: "SceneEditorPreferences",
    path: "scene.editorPreferences"
  },
  {
    title: "World Settings",
    file: "src/document/world-settings.ts",
    typeName: "WorldSettings",
    path: "scene.world"
  },
  {
    title: "Material Definition",
    file: "src/materials/starter-material-library.ts",
    typeName: "MaterialDef",
    path: "project.materials[]"
  },
  {
    title: "Whitebox Solid",
    file: "src/document/brushes.ts",
    typeName: "Brush",
    path: "scene.brushes[]"
  },
  {
    title: "Terrain",
    file: "src/document/terrains.ts",
    typeName: "Terrain",
    path: "scene.terrains[]"
  },
  {
    title: "Path",
    file: "src/document/paths.ts",
    typeName: "ScenePath",
    path: "scene.paths[]"
  },
  {
    title: "Model Instance",
    file: "src/assets/model-instances.ts",
    typeName: "ModelInstance",
    path: "scene.modelInstances[]"
  },
  {
    title: "Entity",
    file: "src/entities/entity-instances.ts",
    typeName: "EntityInstance",
    path: "scene.entities[]"
  },
  {
    title: "Interaction Link",
    file: "src/interactions/interaction-links.ts",
    typeName: "InteractionLink",
    path: "scene.interactionLinks[]"
  }
];

const IDENTITY_PROPERTIES = new Set(["id", "version", "kind"]);
const DISCRIMINATOR_CANDIDATES = [
  "mode",
  "type",
  "rigType",
  "railPlacementMode",
  "stepClass",
  "scope",
  "format",
  "kind"
] as const;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const configPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, "tsconfig.json");

if (configPath === undefined) {
  throw new Error("Could not find tsconfig.json.");
}

const config = ts.readConfigFile(configPath, ts.sys.readFile);

if (config.error !== undefined) {
  throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
}

const parsedConfig = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  repoRoot
);
const program = ts.createProgram(parsedConfig.fileNames, {
  ...parsedConfig.options,
  noEmit: true
});
const checker = program.getTypeChecker();

function getRootType(root: AuthorableRoot): ts.Type {
  const sourceFile = program.getSourceFile(path.join(repoRoot, root.file));

  if (sourceFile === undefined) {
    throw new Error(`Could not load ${root.file}.`);
  }

  let foundNode: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null = null;

  ts.forEachChild(sourceFile, (node) => {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      node.name.text === root.typeName
    ) {
      foundNode = node;
    }
  });

  if (foundNode === null) {
    throw new Error(`Could not find ${root.typeName} in ${root.file}.`);
  }

  return checker.getTypeAtLocation(foundNode.name);
}

function withoutNullish(type: ts.Type): ts.Type {
  if (!type.isUnion()) {
    return type;
  }

  const nonNullishTypes = type.types.filter(
    (part) =>
      (part.flags & ts.TypeFlags.Null) === 0 &&
      (part.flags & ts.TypeFlags.Undefined) === 0
  );

  return nonNullishTypes.length === 1 ? nonNullishTypes[0]! : type;
}

function isLeafType(type: ts.Type): boolean {
  const normalizedType = withoutNullish(type);

  if (normalizedType.isUnion()) {
    return normalizedType.types.every(isLeafType);
  }

  return (
    (normalizedType.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Never)) !==
    0
  );
}

function getArrayElementType(type: ts.Type): ts.Type | null {
  const normalizedType = withoutNullish(type);

  if (!checker.isArrayType(normalizedType) && !checker.isTupleType(normalizedType)) {
    return null;
  }

  return checker.getTypeArguments(normalizedType as ts.TypeReference)[0] ?? null;
}

function getRecordValueType(type: ts.Type): ts.Type | null {
  const normalizedType = withoutNullish(type);
  return checker.getIndexTypeOfType(normalizedType, ts.IndexKind.String) ?? null;
}

function getPropertyType(type: ts.Type, propertyName: string): ts.Type | null {
  const property = type.getProperty(propertyName);

  if (property === undefined) {
    return null;
  }

  const declaration = property.valueDeclaration ?? property.declarations?.[0];
  return checker.getTypeOfSymbolAtLocation(
    property,
    declaration ?? propertyDeclarationsFallback()
  );
}

function propertyDeclarationsFallback(): ts.Node {
  return program.getSourceFiles()[0]!;
}

function literalLabel(type: ts.Type): string | null {
  if (type.isStringLiteral()) {
    return type.value;
  }

  if (type.isNumberLiteral()) {
    return String(type.value);
  }

  const typeText = checker.typeToString(type);

  if (typeText === "true" || typeText === "false") {
    return typeText;
  }

  return null;
}

function literalUnionLabels(type: ts.Type): string[] {
  const normalizedType = withoutNullish(type);
  const parts = normalizedType.isUnion() ? normalizedType.types : [normalizedType];
  const labels = parts.map(literalLabel).filter((label) => label !== null);
  return labels.length === parts.length ? labels : [];
}

function chooseDiscriminator(types: readonly ts.Type[]): string | null {
  for (const candidate of DISCRIMINATOR_CANDIDATES) {
    const labels = types
      .map((type) => {
        const propertyType = getPropertyType(type, candidate);
        return propertyType === null ? null : literalUnionLabels(propertyType)[0] ?? null;
      })
      .filter((label) => label !== null);

    if (labels.length === types.length && new Set(labels).size > 1) {
      return candidate;
    }
  }

  return null;
}

function appendCondition(
  condition: string | null,
  nextCondition: string | null
): string | null {
  if (nextCondition === null) {
    return condition;
  }

  return condition === null ? nextCondition : `${condition}; ${nextCondition}`;
}

function fieldKey(entry: FieldEntry): string {
  return `${entry.path}::${entry.condition ?? ""}`;
}

function collectFields(
  type: ts.Type,
  currentPath: string,
  entries: FieldEntry[],
  options: {
    condition: string | null;
    skipProperties: ReadonlySet<string>;
  }
): void {
  const normalizedType = withoutNullish(type);

  if (isLeafType(normalizedType)) {
    entries.push({
      path: currentPath,
      condition: options.condition
    });
    return;
  }

  const arrayElementType = getArrayElementType(normalizedType);

  if (arrayElementType !== null) {
    collectFields(arrayElementType, `${currentPath}[]`, entries, options);
    return;
  }

  const recordValueType = getRecordValueType(normalizedType);

  if (recordValueType !== null) {
    collectFields(recordValueType, `${currentPath}[]`, entries, options);
    return;
  }

  if (normalizedType.isUnion()) {
    collectUnionFields(normalizedType.types, currentPath, entries, options);
    return;
  }

  collectObjectFields(normalizedType, currentPath, entries, options);
}

function collectUnionFields(
  types: readonly ts.Type[],
  currentPath: string,
  entries: FieldEntry[],
  options: {
    condition: string | null;
    skipProperties: ReadonlySet<string>;
  }
): void {
  const objectTypes = types.filter((type) => !isLeafType(type));

  if (objectTypes.length === 0) {
    entries.push({
      path: currentPath,
      condition: options.condition
    });
    return;
  }

  const discriminator = chooseDiscriminator(objectTypes);

  if (
    discriminator !== null &&
    !IDENTITY_PROPERTIES.has(discriminator) &&
    !options.skipProperties.has(discriminator)
  ) {
    entries.push({
      path: `${currentPath}.${discriminator}`,
      condition: options.condition
    });
  }

  const propertyNameSets = objectTypes.map(
    (type) => new Set(type.getProperties().map((property) => property.name))
  );
  const commonPropertyNames = [...propertyNameSets[0] ?? []].filter((name) =>
    propertyNameSets.every((names) => names.has(name))
  );
  const commonProperties = new Set(
    commonPropertyNames.filter((name) => {
      if (
        name === discriminator ||
        IDENTITY_PROPERTIES.has(name) ||
        options.skipProperties.has(name)
      ) {
        return false;
      }

      const typeLabels = objectTypes.map((objectType) => {
        const propertyType = getPropertyType(objectType, name);
        return propertyType === null ? "" : checker.typeToString(propertyType);
      });

      return new Set(typeLabels).size === 1;
    })
  );

  for (const propertyName of commonProperties) {
    const propertyType = getPropertyType(objectTypes[0]!, propertyName);

    if (propertyType !== null) {
      collectFields(propertyType, `${currentPath}.${propertyName}`, entries, options);
    }
  }

  for (const objectType of objectTypes) {
    const discriminatorType =
      discriminator === null ? null : getPropertyType(objectType, discriminator);
    const discriminatorValue =
      discriminatorType === null
        ? null
        : literalUnionLabels(discriminatorType)[0] ?? null;
    const condition = appendCondition(
      options.condition,
      discriminator !== null && discriminatorValue !== null
        ? `${discriminator}=${discriminatorValue}`
        : null
    );

    collectObjectFields(objectType, currentPath, entries, {
      condition,
      skipProperties: options.skipProperties,
      skipPropertiesForThisObject: new Set([
        ...commonProperties,
        ...(discriminator === null ? [] : [discriminator])
      ])
    });
  }
}

function collectObjectFields(
  type: ts.Type,
  currentPath: string,
  entries: FieldEntry[],
  options: {
    condition: string | null;
    skipProperties: ReadonlySet<string>;
    skipPropertiesForThisObject?: ReadonlySet<string>;
  }
): void {
  for (const property of type.getProperties()) {
    const propertyName = property.name;

    if (
      IDENTITY_PROPERTIES.has(propertyName) ||
      options.skipProperties.has(propertyName) ||
      options.skipPropertiesForThisObject?.has(propertyName)
    ) {
      continue;
    }

    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const propertyType = checker.getTypeOfSymbolAtLocation(
      property,
      declaration ?? propertyDeclarationsFallback()
    );

    collectFields(propertyType, `${currentPath}.${propertyName}`, entries, {
      condition: options.condition,
      skipProperties: options.skipProperties
    });
  }
}

function uniqueEntries(entries: readonly FieldEntry[]): FieldEntry[] {
  const seen = new Set<string>();
  const unique: FieldEntry[] = [];

  for (const entry of entries) {
    const key = fieldKey(entry);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(entry);
  }

  return unique;
}

function formatEntry(entry: FieldEntry): string {
  return entry.condition === null ? entry.path : `${entry.path} [${entry.condition}]`;
}

function wrapFieldList(fields: readonly string[], indent = "  "): string[] {
  const lines: string[] = [];
  let currentLine = indent;

  for (const field of fields) {
    const nextText = currentLine.trim().length === 0 ? field : `${currentLine.trimEnd()}${currentLine.trim() === "" ? "" : ", "}${field}`;

    if (nextText.length > 118 && currentLine.trim().length > 0) {
      lines.push(currentLine.trimEnd());
      currentLine = `${indent}${field}`;
    } else {
      currentLine = nextText;
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
}

const groupedFields = ROOTS.map((root) => {
  const entries: FieldEntry[] = [];
  collectFields(getRootType(root), root.path, entries, {
    condition: null,
    skipProperties: new Set(root.skipProperties ?? [])
  });

  return {
    title: root.title,
    fields: uniqueEntries(entries).map(formatEntry)
  };
});

const totalFieldCount = groupedFields.reduce(
  (sum, group) => sum + group.fields.length,
  0
);
const lines = [
  "Authorable field inventory",
  "Source: current canonical TypeScript authoring schemas",
  "Excludes: ids, version, kind discriminators, textures, and generated imported-asset metadata/storage fields.",
  `Total: ${totalFieldCount} field paths across ${groupedFields.length} groups.`,
  ""
];

for (const group of groupedFields) {
  lines.push(`${group.title} (${group.fields.length})`);
  lines.push(...wrapFieldList(group.fields));
  lines.push("");
}

process.stdout.write(`${lines.join("\n").trimEnd()}\n`);
