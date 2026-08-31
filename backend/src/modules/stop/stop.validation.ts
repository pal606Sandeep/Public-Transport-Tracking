import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const locationSchema = z
  .object({
    type: z.literal("Point"),
    coordinates: z
      .tuple([z.number(), z.number()])
      .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, {
        message: "coordinates must be [lng, lat] within valid ranges",
      }),
  })
  .strict();

export const createStopSchema = z
  .object({
    name: z.string().min(1).max(120),
    code: z.string().max(40).nullable().optional(),
    location: locationSchema,
    address: z.string().max(255).nullable().optional(),
    facilities: z.array(z.string().max(60).nullable()).default([]),
    shelter: z.string().max(60).nullable().optional(),
    accessibility: z.boolean().default(false),
    nearbyLandmarks: z.array(z.string().max(120).nullable()).default([]),
    routes: z.array(idString).default([]),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateStopSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    code: z.string().max(40).nullable().optional(),
    location: locationSchema.optional(),
    address: z.string().max(255).nullable().optional(),
    facilities: z.array(z.string().max(60).nullable()).optional(),
    shelter: z.string().max(60).nullable().optional(),
    accessibility: z.boolean().optional(),
    nearbyLandmarks: z.array(z.string().max(120).nullable()).optional(),
    routes: z.array(idString).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
