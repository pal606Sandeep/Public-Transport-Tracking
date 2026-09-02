import { z } from "zod";

export const routeFormSchema = z.object({
  routeNumber: z.string().min(1, "Route number is required").max(40),
  name: z.string().max(120).optional(),
  direction: z.string().max(40).optional(),
  distanceKm: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional(),
  estimatedDurationMin: z
    .union([z.coerce.number().int().min(0), z.literal("")])
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  /** One "lng,lat" per line. Optional; needs >= 2 points if provided. */
  geometryText: z.string().optional(),
});

export type RouteFormValues = z.input<typeof routeFormSchema>;
export type RouteFormParsed = z.output<typeof routeFormSchema>;

/** Parse the geometry textarea into a GeoJSON LineString, or null. Throws on bad input. */
export function parseGeometryText(text?: string):
  | { type: "LineString"; coordinates: [number, number][] }
  | null {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;
  const coords: [number, number][] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const row = line.trim();
    if (!row) continue;
    const parts = row.split(",").map((p) => Number(p.trim()));
    if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
      throw new Error(`Bad coordinate line: "${row}" — expected "lng,lat"`);
    }
    coords.push([parts[0], parts[1]]);
  }
  if (coords.length < 2) {
    throw new Error("Geometry needs at least 2 points");
  }
  return { type: "LineString", coordinates: coords };
}

export function geometryToText(
  geom?: { coordinates: [number, number][] } | null
): string {
  return (geom?.coordinates ?? []).map(([lng, lat]) => `${lng},${lat}`).join("\n");
}
