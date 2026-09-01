import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

/** Accepts either a 24-hex stopId or a "lat,lng" pair. */
const point = z.string().refine(
  (v) => /^[a-f\d]{24}$/i.test(v) || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(v),
  "Must be a stopId or 'lat,lng'"
);

export const routeSearchQuery = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const stopSearchQuery = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().int().min(1).max(50000).default(2000),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((v) => v.q !== undefined || (v.lat !== undefined && v.lng !== undefined), {
    message: "Provide q, or both lat and lng",
  });

export const findBusQuery = z
  .object({
    from: objectId,
    to: objectId,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const journeyQuery = z
  .object({
    from: point,
    to: point,
    time: z.coerce.number().int().positive().optional(),
    maxTransfers: z.coerce.number().int().min(0).max(1).default(1),
  })
  .strict();
