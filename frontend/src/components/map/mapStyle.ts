import type { StyleSpecification } from "maplibre-gl";

/** Keyless raster style. Extend with a switch on `source` when more providers are configured. */
const OSM: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

export const styleFor = (source?: string): StyleSpecification => {
  switch (source) {
    // room for "maptiler", "satellite", … keyed styles later
    default:
      return OSM;
  }
};
