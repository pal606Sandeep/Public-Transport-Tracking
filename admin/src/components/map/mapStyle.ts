import type { StyleSpecification } from "maplibre-gl";

/**
 * Raster basemap. Defaults to OpenStreetMap (keyless, per-IP rate limited,
 * blocked by some ad-blockers). Override with a `{z}/{x}/{y}` template via
 * NEXT_PUBLIC_MAP_TILE_URL (e.g. a MapTiler / Stadia URL with your key).
 */
const ENV_TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL;

const OSM_TILES = [
  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];

export const styleFor = (): StyleSpecification => ({
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: ENV_TILE ? [ENV_TILE] : OSM_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution: ENV_TILE
        ? "© MapTiler © OpenStreetMap contributors"
        : "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#e8eaed" } },
    { id: "base", type: "raster", source: "base" },
  ],
});
