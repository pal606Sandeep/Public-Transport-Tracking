import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const pointPair = z
  .tuple([z.number(), z.number()])
  .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, {
    message: "coordinates must be [lng, lat] within valid ranges",
  });

const lineStringSchema = z
  .object({
    type: z.literal("LineString"),
    coordinates: z.array(pointPair).min(2),
  })
  .strict();

export const stopEntrySchema = z
  .object({
    stopId: idString,
    sequence: z.coerce.number().int().min(0),
    scheduledOffsetMinutes: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const createRouteSchema = z
  .object({
    routeNumber: z.string().min(1).max(40),
    name: z.string().max(120).nullable().optional(),
    source: idString.nullable().optional(),
    destination: idString.nullable().optional(),
    distanceKm: z.coerce.number().min(0).nullable().optional(),
    estimatedDurationMin: z.coerce.number().int().min(0).nullable().optional(),
    geometry: lineStringSchema.nullable().optional(),
    direction: z.string().max(40).nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    orderedStops: z.array(stopEntrySchema).default([]),
  })
  .strict();

export const updateRouteSchema = z
  .object({
    routeNumber: z.string().min(1).max(40).optional(),
    name: z.string().max(120).nullable().optional(),
    source: idString.nullable().optional(),
    destination: idString.nullable().optional(),
    distanceKm: z.coerce.number().min(0).nullable().optional(),
    estimatedDurationMin: z.coerce.number().int().min(0).nullable().optional(),
    geometry: lineStringSchema.nullable().optional(),
    direction: z.string().max(40).nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export const addStopSchema = z
  .object({
    stopId: idString,
    sequence: z.coerce.number().int().min(0),
    scheduledOffsetMinutes: z.coerce.number().int().min(0).default(0),
  })
  .strict();
