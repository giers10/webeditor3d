import type { CSSProperties } from "react";

import type { WorldBackgroundSettings } from "../document/world-settings";

export function createWorldBackgroundStyle(background: WorldBackgroundSettings): CSSProperties {
  if (background.mode === "solid") {
    return {
      backgroundColor: background.colorHex,
      backgroundImage: "none"
    };
  }

  return {
    backgroundColor: background.bottomColorHex,
    backgroundImage: `linear-gradient(180deg, ${background.topColorHex} 0%, ${background.bottomColorHex} 100%)`
  };
}
