import path from "node:path";
import ts from "typescript";

type InventoryScope = "authorable" | "runtime" | "all";

interface FieldRoot {
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

interface TraversalOptions {
  condition: string | null;
  skipProperties: ReadonlySet<string>;
  includeIdentityProperties: boolean;
  skipPropertiesForThisObject?: ReadonlySet<string>;
  typeStack: ReadonlySet<string>;
}

const AUTHORABLE_ROOTS: readonly FieldRoot[] = [
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

const RUNTIME_SOURCE_DIRECTORIES = ["src/runtime-three"] as const;
const RUNTIME_SOURCE_FILES = ["src/controls/control-surface.ts"] as const;
const IDENTITY_PROPERTIES = new Set(["id", "version"]);
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
const TYPED_ARRAY_TYPE_NAMES = new Set([
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Uint16Array",
  "Uint32Array"
]);

const repoRoot = process.cwd();
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

function getRootType(root: FieldRoot): ts.Type {
  const sourceFile = program.getSourceFile(path.join(repoRoot, root.file));

  if (sourceFile === undefined) {
    throw new Error(`Could not load ${root.file}.`);
  }

  let foundName: ts.Identifier | null = null;

  ts.forEachChild(sourceFile, (node) => {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      node.name.text === root.typeName
    ) {
      foundName = node.name;
    }
  });

  if (foundName === null) {
    throw new Error(`Could not find ${root.typeName} in ${root.file}.`);
  }

  return checker.getTypeAtLocation(foundName);
}

function isExportedDeclaration(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    ) ??
      false)
  );
}

function formatTypeTitle(typeName: string): string {
  return typeName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

function isRuntimeSourceFile(sourceFile: ts.SourceFile): boolean {
  const relativePath = path.relative(repoRoot, sourceFile.fileName);

  return (
    RUNTIME_SOURCE_FILES.includes(relativePath as (typeof RUNTIME_SOURCE_FILES)[number]) ||
    RUNTIME_SOURCE_DIRECTORIES.some((directory) =>
      relativePath.startsWith(`${directory}${path.sep}`)
    )
  );
}

function discoverRuntimeRoots(): FieldRoot[] {
  const roots: FieldRoot[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (
      sourceFile.isDeclarationFile ||
      sourceFile.fileName.includes(`${path.sep}node_modules${path.sep}`) ||
      !isRuntimeSourceFile(sourceFile)
    ) {
      continue;
    }

    const relativePath = path.relative(repoRoot, sourceFile.fileName);

    for (const statement of sourceFile.statements) {
      if (
        !isExportedDeclaration(statement) ||
        (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) ||
        !statement.name.text.startsWith("Runtime")
      ) {
        continue;
      }

      const type = checker.getTypeAtLocation(statement.name);

      if (isLeafType(type)) {
        continue;
      }

      roots.push({
        title: formatTypeTitle(statement.name.text),
        file: relativePath,
        typeName: statement.name.text,
        path: `runtime.${statement.name.text}`
      });
    }
  }

  return roots.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.typeName.localeCompare(right.typeName)
  );
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

function getTypeKey(type: ts.Type): string {
  const internalType = type as ts.Type & { id?: number };
  return String(
    internalType.id ??
      type.aliasSymbol?.escapedName ??
      type.symbol?.escapedName ??
      type.flags
  );
}

function isCallableType(type: ts.Type): boolean {
  const normalizedType = withoutNullish(type);
  return normalizedType.getCallSignatures().length > 0;
}

function getArrayElementType(type: ts.Type): ts.Type | null {
  const normalizedType = withoutNullish(type);

  if (!checker.isArrayType(normalizedType) && !checker.isTupleType(normalizedType)) {
    return null;
  }

  return checker.getTypeArguments(normalizedType as ts.TypeReference)[0] ?? null;
}

function isTypedArrayType(type: ts.Type): boolean {
  const normalizedType = withoutNullish(type);
  const typeName = String(
    normalizedType.aliasSymbol?.escapedName ??
      normalizedType.symbol?.escapedName ??
      ""
  );
  return TYPED_ARRAY_TYPE_NAMES.has(typeName);
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

  const intrinsicName = (type as ts.Type & { intrinsicName?: string })
    .intrinsicName;

  if (intrinsicName === "true" || intrinsicName === "false") {
    return intrinsicName;
  }

  return null;
}

function literalUnionLabels(type: ts.Type): string[] {
  const normalizedType = withoutNullish(type);
  const parts = normalizedType.isUnion() ? normalizedType.types : [normalizedType];
  const labels = parts.map(literalLabel).filter((label) => label !== null);
  return labels.length === parts.length ? labels : [];
}

function shouldSkipProperty(
  propertyName: string,
  propertyType: ts.Type | null,
  options: TraversalOptions
): boolean {
  if (
    (!options.includeIdentityProperties &&
      IDENTITY_PROPERTIES.has(propertyName)) ||
    options.skipProperties.has(propertyName) ||
    options.skipPropertiesForThisObject?.has(propertyName)
  ) {
    return true;
  }

  if (propertyName !== "kind" || propertyType === null) {
    return false;
  }

  return (
    !options.includeIdentityProperties &&
    literalUnionLabels(propertyType).length === 1
  );
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

function createConditionLabel(
  currentPath: string,
  discriminator: string,
  value: string
): string {
  const parentName = currentPath.split(".").at(-1)?.replace(/\[\]$/, "") ?? "";

  if (
    (discriminator === "kind" ||
      discriminator === "type" ||
      discriminator === "mode") &&
    parentName.length > 0 &&
    !parentName.endsWith("s")
  ) {
    return `${parentName}.${discriminator}=${value}`;
  }

  return `${discriminator}=${value}`;
}

function fieldKey(entry: FieldEntry): string {
  return `${entry.path}::${entry.condition ?? ""}`;
}

function collectFields(
  type: ts.Type,
  currentPath: string,
  entries: FieldEntry[],
  options: TraversalOptions
): void {
  const normalizedType = withoutNullish(type);

  if (isLeafType(normalizedType)) {
    entries.push({
      path: currentPath,
      condition: options.condition
    });
    return;
  }

  if (isCallableType(normalizedType)) {
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

  if (isTypedArrayType(normalizedType)) {
    entries.push({
      path: `${currentPath}[]`,
      condition: options.condition
    });
    return;
  }

  const recordValueType = getRecordValueType(normalizedType);

  if (recordValueType !== null) {
    collectFields(recordValueType, `${currentPath}[]`, entries, options);
    return;
  }

  if (normalizedType.isUnion()) {
    const typeKey = getTypeKey(normalizedType);

    if (options.typeStack.has(typeKey)) {
      entries.push({
        path: currentPath,
        condition: options.condition
      });
      return;
    }

    collectUnionFields(normalizedType.types, currentPath, entries, {
      ...options,
      typeStack: new Set([...options.typeStack, typeKey])
    });
    return;
  }

  const typeKey = getTypeKey(normalizedType);

  if (options.typeStack.has(typeKey)) {
    entries.push({
      path: currentPath,
      condition: options.condition
    });
    return;
  }

  collectObjectFields(normalizedType, currentPath, entries, {
    ...options,
    typeStack: new Set([...options.typeStack, typeKey])
  });
}

function collectUnionFields(
  types: readonly ts.Type[],
  currentPath: string,
  entries: FieldEntry[],
  options: TraversalOptions
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
    !shouldSkipProperty(
      discriminator,
      getPropertyType(objectTypes[0]!, discriminator),
      options
    )
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
        shouldSkipProperty(name, getPropertyType(objectTypes[0]!, name), options)
      ) {
        return false;
      }

      const typeLabels = objectTypes.map((objectType) => {
        const propertyType = getPropertyType(objectType, name);
        return propertyType === null
          ? ""
          : getTypeKey(withoutNullish(propertyType));
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

  const groupedTypes = new Map<string, ts.Type[]>();

  for (const objectType of objectTypes) {
    const discriminatorType =
      discriminator === null ? null : getPropertyType(objectType, discriminator);
    const discriminatorValue =
      discriminatorType === null
        ? ""
        : literalUnionLabels(discriminatorType)[0] ?? "";
    const groupKey =
      discriminator === null ? getTypeKey(objectType) : discriminatorValue;
    groupedTypes.set(groupKey, [...(groupedTypes.get(groupKey) ?? []), objectType]);
  }

  for (const [groupKey, groupTypes] of groupedTypes) {
    const condition = appendCondition(
      options.condition,
      discriminator !== null && groupKey.length > 0
        ? createConditionLabel(currentPath, discriminator, groupKey)
        : null
    );
    const skippedForGroup = new Set([
      ...options.skipProperties,
      ...commonProperties,
      ...(discriminator === null ? [] : [discriminator])
    ]);

    if (groupTypes.length > 1) {
      collectUnionFields(groupTypes, currentPath, entries, {
        condition,
        skipProperties: skippedForGroup,
        includeIdentityProperties: options.includeIdentityProperties,
        typeStack: options.typeStack
      });
      continue;
    }

    collectObjectFields(groupTypes[0]!, currentPath, entries, {
      condition,
      skipProperties: options.skipProperties,
      includeIdentityProperties: options.includeIdentityProperties,
      skipPropertiesForThisObject: skippedForGroup,
      typeStack: options.typeStack
    });
  }
}

function collectObjectFields(
  type: ts.Type,
  currentPath: string,
  entries: FieldEntry[],
  options: TraversalOptions
): void {
  for (const property of type.getProperties()) {
    const propertyName = property.name;

    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const propertyType = checker.getTypeOfSymbolAtLocation(
      property,
      declaration ?? propertyDeclarationsFallback()
    );

    if (shouldSkipProperty(propertyName, propertyType, options)) {
      continue;
    }

    collectFields(propertyType, `${currentPath}.${propertyName}`, entries, {
      condition: options.condition,
      skipProperties: options.skipProperties,
      includeIdentityProperties: options.includeIdentityProperties,
      typeStack: options.typeStack
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

function collectRootFields(
  roots: readonly FieldRoot[],
  includeIdentityProperties: boolean
) {
  return roots.map((root) => {
    const entries: FieldEntry[] = [];
    collectFields(getRootType(root), root.path, entries, {
      condition: null,
      skipProperties: new Set(root.skipProperties ?? []),
      includeIdentityProperties,
      typeStack: new Set()
    });

    return {
      title: root.title,
      fields: uniqueEntries(entries).map(formatEntry)
    };
  });
}

function parseScope(args: readonly string[]): InventoryScope {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      [
        "Usage: list-authorable-fields [--authorable-only | --runtime-only | --include-runtime]",
        "",
        "Default: --authorable-only",
        "--runtime-only     List exported Runtime* field roots from runtime/control code.",
        "--include-runtime  List authorable fields first, then runtime fields."
      ].join("\n") + "\n"
    );
    process.exit(0);
  }

  if (args.includes("--runtime-only")) {
    return "runtime";
  }

  if (args.includes("--include-runtime") || args.includes("--all")) {
    return "all";
  }

  return "authorable";
}

function createGroupedFields(scope: InventoryScope) {
  switch (scope) {
    case "authorable":
      return {
        title: "Authorable field inventory",
        source:
          "Source: current canonical TypeScript authoring schemas",
        excludes:
          "Excludes: ids, version, kind discriminators, textures, and generated imported-asset metadata/storage fields.",
        groups: collectRootFields(AUTHORABLE_ROOTS, false)
      };
    case "runtime": {
      const runtimeRoots = discoverRuntimeRoots();
      return {
        title: "Runtime field inventory",
        source:
          "Source: exported Runtime* TypeScript types in src/runtime-three and src/controls/control-surface.ts",
        excludes:
          "Includes ids and discriminators. Omits primitive-only Runtime* aliases because they have no object fields.",
        groups: collectRootFields(runtimeRoots, true)
      };
    }
    case "all": {
      const runtimeRoots = discoverRuntimeRoots();
      return {
        title: "Authorable and runtime field inventory",
        source:
          "Source: canonical authoring schemas plus exported Runtime* TypeScript types.",
        excludes:
          "Authorable groups exclude ids/version/kind discriminators; runtime groups include ids and discriminators.",
        groups: [
          ...collectRootFields(AUTHORABLE_ROOTS, false).map((group) => ({
            ...group,
            title: `Authorable: ${group.title}`
          })),
          ...collectRootFields(runtimeRoots, true).map((group) => ({
            ...group,
            title: `Runtime: ${group.title}`
          }))
        ]
      };
  }
  }
}

const inventory = createGroupedFields(parseScope(process.argv.slice(2)));
const groupedFields = inventory.groups;
const totalFieldCount = groupedFields.reduce(
  (sum, group) => sum + group.fields.length,
  0
);
const lines = [
  inventory.title,
  inventory.source,
  inventory.excludes,
  `Total: ${totalFieldCount} field paths across ${groupedFields.length} groups.`,
  ""
];

for (const group of groupedFields) {
  lines.push(`${group.title} (${group.fields.length})`);
  lines.push(...wrapFieldList(group.fields));
  lines.push("");
}

process.stdout.write(`${lines.join("\n").trimEnd()}\n`);
