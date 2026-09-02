import type { StyleSpecification } from "maplibre-gl";

/** Keyless raster style. */
const OSM: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      // OSM's tile server only serves up to z19 — cap here so MapLibre
      // upscales z19 tiles past that instead of requesting 404s.
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base", maxzoom: 22 }],
};

export const styleFor = (): StyleSpecification => OSM;
