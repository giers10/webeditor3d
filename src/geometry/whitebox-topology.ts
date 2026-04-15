import {
  BOX_EDGE_IDS,
  BOX_EDGE_LABELS,
  BOX_FACE_IDS,
  BOX_FACE_LABELS,
  BOX_VERTEX_IDS,
  BOX_VERTEX_LABELS,
  WEDGE_EDGE_IDS,
  WEDGE_EDGE_LABELS,
  WEDGE_FACE_IDS,
  WEDGE_FACE_LABELS,
  WEDGE_VERTEX_IDS,
  WEDGE_VERTEX_LABELS,
  getConeEdgeIds,
  getConeFaceIds,
  getConeVertexIds,
  getRadialPrismEdgeIds,
  getRadialPrismFaceIds,
  getRadialPrismVertexIds,
  getTorusEdgeIds,
  getTorusFaceIds,
  getTorusVertexIds,
  type Brush,
  type BoxEdgeId,
  type BoxFaceId,
  type BoxVertexId,
  type ConeBrush,
  type ConeEdgeId,
  type ConeFaceId,
  type ConeVertexId,
  type RadialPrismBrush,
  type RadialPrismEdgeId,
  type RadialPrismFaceId,
  type RadialPrismVertexId,
  type TorusBrush,
  type TorusEdgeId,
  type TorusFaceId,
  type TorusVertexId,
  type WhiteboxEdgeId,
  type WhiteboxFaceId,
  type WhiteboxVertexId,
  type WedgeEdgeId,
  type WedgeFaceId,
  type WedgeVertexId
} from "../document/brushes";

const BOX_FACE_VERTEX_IDS: Record<
  BoxFaceId,
  readonly [BoxVertexId, BoxVertexId, BoxVertexId, BoxVertexId]
> = {
  posX: ["posX_negY_posZ", "posX_negY_negZ", "posX_posY_negZ", "posX_posY_posZ"],
  negX: ["negX_negY_negZ", "negX_negY_posZ", "negX_posY_posZ", "negX_posY_negZ"],
  posY: ["negX_posY_posZ", "posX_posY_posZ", "posX_posY_negZ", "negX_posY_negZ"],
  negY: ["negX_negY_negZ", "posX_negY_negZ", "posX_negY_posZ", "negX_negY_posZ"],
  posZ: ["negX_negY_posZ", "posX_negY_posZ", "posX_posY_posZ", "negX_posY_posZ"],
  negZ: ["posX_negY_negZ", "negX_negY_negZ", "negX_posY_negZ", "posX_posY_negZ"]
};

const BOX_EDGE_VERTEX_IDS: Record<
  BoxEdgeId,
  readonly [BoxVertexId, BoxVertexId]
> = {
  edgeX_negY_negZ: ["negX_negY_negZ", "posX_negY_negZ"],
  edgeX_posY_negZ: ["negX_posY_negZ", "posX_posY_negZ"],
  edgeX_negY_posZ: ["negX_negY_posZ", "posX_negY_posZ"],
  edgeX_posY_posZ: ["negX_posY_posZ", "posX_posY_posZ"],
  edgeY_negX_negZ: ["negX_negY_negZ", "negX_posY_negZ"],
  edgeY_posX_negZ: ["posX_negY_negZ", "posX_posY_negZ"],
  edgeY_negX_posZ: ["negX_negY_posZ", "negX_posY_posZ"],
  edgeY_posX_posZ: ["posX_negY_posZ", "posX_posY_posZ"],
  edgeZ_negX_negY: ["negX_negY_negZ", "negX_negY_posZ"],
  edgeZ_posX_negY: ["posX_negY_negZ", "posX_negY_posZ"],
  edgeZ_negX_posY: ["negX_posY_negZ", "negX_posY_posZ"],
  edgeZ_posX_posY: ["posX_posY_negZ", "posX_posY_posZ"]
};

const WEDGE_FACE_VERTEX_IDS: Record<WedgeFaceId, readonly WedgeVertexId[]> = {
  bottom: [
    "negX_negY_negZ",
    "posX_negY_negZ",
    "posX_negY_posZ",
    "negX_negY_posZ"
  ],
  back: ["posX_negY_negZ", "negX_negY_negZ", "negX_posY_negZ", "posX_posY_negZ"],
  slope: ["negX_negY_posZ", "posX_negY_posZ", "posX_posY_negZ", "negX_posY_negZ"],
  left: ["negX_negY_negZ", "negX_negY_posZ", "negX_posY_negZ"],
  right: ["posX_negY_posZ", "posX_negY_negZ", "posX_posY_negZ"]
};

const WEDGE_EDGE_VERTEX_IDS: Record<
  WedgeEdgeId,
  readonly [WedgeVertexId, WedgeVertexId]
> = {
  bottomBack: ["negX_negY_negZ", "posX_negY_negZ"],
  bottomFront: ["negX_negY_posZ", "posX_negY_posZ"],
  bottomLeft: ["negX_negY_negZ", "negX_negY_posZ"],
  bottomRight: ["posX_negY_negZ", "posX_negY_posZ"],
  topBack: ["negX_posY_negZ", "posX_posY_negZ"],
  leftBack: ["negX_negY_negZ", "negX_posY_negZ"],
  rightBack: ["posX_negY_negZ", "posX_posY_negZ"],
  leftSlope: ["negX_posY_negZ", "negX_negY_posZ"],
  rightSlope: ["posX_posY_negZ", "posX_negY_posZ"]
};

function parseIndexedWhiteboxId(
  value: string,
  prefix: string
): number[] {
  return value
    .slice(prefix.length)
    .split("-")
    .map((segment) => Number(segment));
}

function getRadialPrismFaceLabel(faceId: RadialPrismFaceId): string {
  if (faceId === "top") {
    return "Top";
  }

  if (faceId === "bottom") {
    return "Bottom";
  }

  return `Side ${Number(faceId.slice(5)) + 1}`;
}

function getRadialPrismEdgeLabel(edgeId: RadialPrismEdgeId): string {
  if (edgeId.startsWith("vertical-")) {
    return `Vertical ${Number(edgeId.slice(9)) + 1}`;
  }

  if (edgeId.startsWith("top-")) {
    return `Top Ring ${Number(edgeId.slice(4)) + 1}`;
  }

  return `Bottom Ring ${Number(edgeId.slice(7)) + 1}`;
}

function getRadialPrismVertexLabel(vertexId: RadialPrismVertexId): string {
  if (vertexId.startsWith("top-")) {
    return `Top ${Number(vertexId.slice(4)) + 1}`;
  }

  return `Bottom ${Number(vertexId.slice(7)) + 1}`;
}

function getConeFaceLabel(faceId: ConeFaceId): string {
  if (faceId === "bottom") {
    return "Bottom";
  }

  return `Side ${Number(faceId.slice(5)) + 1}`;
}

function getConeEdgeLabel(edgeId: ConeEdgeId): string {
  if (edgeId.startsWith("bottom-")) {
    return `Bottom Ring ${Number(edgeId.slice(7)) + 1}`;
  }

  return `Side ${Number(edgeId.slice(5)) + 1}`;
}

function getConeVertexLabel(vertexId: ConeVertexId): string {
  if (vertexId === "apex") {
    return "Apex";
  }

  return `Bottom ${Number(vertexId.slice(7)) + 1}`;
}

function getTorusFaceLabel(faceId: TorusFaceId): string {
  const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(faceId, "face-");
  return `Face ${majorIndex + 1}:${tubeIndex + 1}`;
}

function getTorusEdgeLabel(edgeId: TorusEdgeId): string {
  if (edgeId.startsWith("major-")) {
    const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(edgeId, "major-");
    return `Major ${majorIndex + 1}:${tubeIndex + 1}`;
  }

  const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(edgeId, "tube-");
  return `Tube ${majorIndex + 1}:${tubeIndex + 1}`;
}

function getTorusVertexLabel(vertexId: TorusVertexId): string {
  const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(
    vertexId,
    "vertex-"
  );
  return `Vertex ${majorIndex + 1}:${tubeIndex + 1}`;
}

function getRadialPrismFaceVertexIds(
  brush: RadialPrismBrush,
  faceId: RadialPrismFaceId
): WhiteboxVertexId[] {
  if (faceId === "top") {
    return Array.from({ length: brush.sideCount }, (_, index) => `top-${index}` as const);
  }

  if (faceId === "bottom") {
    return Array.from(
      { length: brush.sideCount },
      (_, index) => `bottom-${brush.sideCount - 1 - index}` as const
    );
  }

  const sideIndex = Number(faceId.slice(5));
  const nextIndex = (sideIndex + 1) % brush.sideCount;

  return [
    `bottom-${sideIndex}`,
    `bottom-${nextIndex}`,
    `top-${nextIndex}`,
    `top-${sideIndex}`
  ];
}

function getRadialPrismEdgeVertexIds(
  edgeId: RadialPrismEdgeId,
  sideCount: number
): [RadialPrismVertexId, RadialPrismVertexId] {
  if (edgeId.startsWith("vertical-")) {
    const index = Number(edgeId.slice(9));
    return [`bottom-${index}`, `top-${index}`];
  }

  if (edgeId.startsWith("top-")) {
    const index = Number(edgeId.slice(4));
    const nextIndex = (index + 1) % sideCount;
    return [`top-${index}`, `top-${nextIndex}`];
  }

  const index = Number(edgeId.slice(7));
  const nextIndex = (index + 1) % sideCount;
  return [`bottom-${index}`, `bottom-${nextIndex}`];
}

function getConeFaceVertexIds(
  brush: ConeBrush,
  faceId: ConeFaceId
): WhiteboxVertexId[] {
  if (faceId === "bottom") {
    return Array.from(
      { length: brush.sideCount },
      (_, index) => `bottom-${brush.sideCount - 1 - index}` as const
    );
  }

  const sideIndex = Number(faceId.slice(5));
  const nextIndex = (sideIndex + 1) % brush.sideCount;
  return [`bottom-${sideIndex}`, `bottom-${nextIndex}`, "apex"];
}

function getConeEdgeVertexIds(
  edgeId: ConeEdgeId,
  sideCount: number
): [ConeVertexId, ConeVertexId] {
  if (edgeId.startsWith("bottom-")) {
    const index = Number(edgeId.slice(7));
    const nextIndex = (index + 1) % sideCount;
    return [`bottom-${index}`, `bottom-${nextIndex}`];
  }

  const index = Number(edgeId.slice(5));
  return [`bottom-${index}`, "apex"];
}

function getTorusFaceVertexIds(
  brush: TorusBrush,
  faceId: TorusFaceId
): WhiteboxVertexId[] {
  const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(faceId, "face-");
  const nextMajorIndex = (majorIndex + 1) % brush.majorSegmentCount;
  const nextTubeIndex = (tubeIndex + 1) % brush.tubeSegmentCount;
  return [
    `vertex-${majorIndex}-${tubeIndex}`,
    `vertex-${majorIndex}-${nextTubeIndex}`,
    `vertex-${nextMajorIndex}-${nextTubeIndex}`,
    `vertex-${nextMajorIndex}-${tubeIndex}`
  ];
}

function getTorusEdgeVertexIds(
  brush: TorusBrush,
  edgeId: TorusEdgeId
): [TorusVertexId, TorusVertexId] {
  if (edgeId.startsWith("major-")) {
    const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(edgeId, "major-");
    const nextMajorIndex = (majorIndex + 1) % brush.majorSegmentCount;
    return [
      `vertex-${majorIndex}-${tubeIndex}`,
      `vertex-${nextMajorIndex}-${tubeIndex}`
    ];
  }

  const [majorIndex, tubeIndex] = parseIndexedWhiteboxId(edgeId, "tube-");
  const nextTubeIndex = (tubeIndex + 1) % brush.tubeSegmentCount;
  return [
    `vertex-${majorIndex}-${tubeIndex}`,
    `vertex-${majorIndex}-${nextTubeIndex}`
  ];
}

export function getBrushFaceIds(brush: Brush): WhiteboxFaceId[] {
  switch (brush.kind) {
    case "box":
      return [...BOX_FACE_IDS];
    case "wedge":
      return [...WEDGE_FACE_IDS];
    case "radialPrism":
      return getRadialPrismFaceIds(brush.sideCount);
  }
}

export function getBrushEdgeIds(brush: Brush): WhiteboxEdgeId[] {
  switch (brush.kind) {
    case "box":
      return [...BOX_EDGE_IDS];
    case "wedge":
      return [...WEDGE_EDGE_IDS];
    case "radialPrism":
      return getRadialPrismEdgeIds(brush.sideCount);
  }
}

export function getBrushVertexIds(brush: Brush): WhiteboxVertexId[] {
  switch (brush.kind) {
    case "box":
      return [...BOX_VERTEX_IDS];
    case "wedge":
      return [...WEDGE_VERTEX_IDS];
    case "radialPrism":
      return getRadialPrismVertexIds(brush.sideCount);
  }
}

export function getBrushFaceLabel(
  brush: Brush,
  faceId: WhiteboxFaceId
): string {
  switch (brush.kind) {
    case "box":
      return BOX_FACE_LABELS[faceId as BoxFaceId] ?? faceId;
    case "wedge":
      return WEDGE_FACE_LABELS[faceId as WedgeFaceId] ?? faceId;
    case "radialPrism":
      return getRadialPrismFaceLabel(faceId as RadialPrismFaceId);
  }
}

export function getBrushEdgeLabel(
  brush: Brush,
  edgeId: WhiteboxEdgeId
): string {
  switch (brush.kind) {
    case "box":
      return BOX_EDGE_LABELS[edgeId as BoxEdgeId] ?? edgeId;
    case "wedge":
      return WEDGE_EDGE_LABELS[edgeId as WedgeEdgeId] ?? edgeId;
    case "radialPrism":
      return getRadialPrismEdgeLabel(edgeId as RadialPrismEdgeId);
  }
}

export function getBrushVertexLabel(
  brush: Brush,
  vertexId: WhiteboxVertexId
): string {
  switch (brush.kind) {
    case "box":
      return BOX_VERTEX_LABELS[vertexId as BoxVertexId] ?? vertexId;
    case "wedge":
      return WEDGE_VERTEX_LABELS[vertexId as WedgeVertexId] ?? vertexId;
    case "radialPrism":
      return getRadialPrismVertexLabel(vertexId as RadialPrismVertexId);
  }
}

export function getBrushFaceVertexIds(
  brush: Brush,
  faceId: WhiteboxFaceId
): WhiteboxVertexId[] {
  switch (brush.kind) {
    case "box":
      return [...BOX_FACE_VERTEX_IDS[faceId as BoxFaceId]];
    case "wedge":
      return [...WEDGE_FACE_VERTEX_IDS[faceId as WedgeFaceId]];
    case "radialPrism":
      return getRadialPrismFaceVertexIds(brush, faceId as RadialPrismFaceId);
  }
}

export function getBrushEdgeVertexIds(
  brush: Brush,
  edgeId: WhiteboxEdgeId
): [WhiteboxVertexId, WhiteboxVertexId] {
  switch (brush.kind) {
    case "box":
      return [...BOX_EDGE_VERTEX_IDS[edgeId as BoxEdgeId]] as [
        WhiteboxVertexId,
        WhiteboxVertexId
      ];
    case "wedge":
      return [...WEDGE_EDGE_VERTEX_IDS[edgeId as WedgeEdgeId]] as [
        WhiteboxVertexId,
        WhiteboxVertexId
      ];
    case "radialPrism":
      return getRadialPrismEdgeVertexIds(
        edgeId as RadialPrismEdgeId,
        brush.sideCount
      );
  }
}

export function getBoxBrushFaceVertexIds(faceId: BoxFaceId): readonly [
  BoxVertexId,
  BoxVertexId,
  BoxVertexId,
  BoxVertexId
] {
  return BOX_FACE_VERTEX_IDS[faceId];
}

export function getBoxBrushEdgeVertexIds(edgeId: BoxEdgeId): readonly [
  BoxVertexId,
  BoxVertexId
] {
  return BOX_EDGE_VERTEX_IDS[edgeId];
}

export function getBrushDefaultName(brush: Brush, index: number): string {
  switch (brush.kind) {
    case "box":
      return `Whitebox Box ${index + 1}`;
    case "wedge":
      return `Whitebox Wedge ${index + 1}`;
    case "radialPrism":
      return `Whitebox Cylinder ${index + 1}`;
  }
}

export function getBrushKindLabel(brush: Brush): string {
  switch (brush.kind) {
    case "box":
      return "Whitebox Box";
    case "wedge":
      return "Whitebox Wedge";
    case "radialPrism":
      return "Whitebox Cylinder";
  }
}
