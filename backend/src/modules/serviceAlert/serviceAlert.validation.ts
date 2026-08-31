import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const ringSchema = z.array(z.tuple([z.number(), z.number()])).min(4);

const polygonSchema = z
  .object({
    type: z.literal("Polygon"),
    coordinates: z.array(ringSchema).min(1),
  })
  .strict();

const targetingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("routes"), routeIds: z.array(idString).min(1) }).strict(),
  z.object({ type: z.literal("stops"), stopIds: z.array(idString).min(1) }).strict(),
  z.object({ type: z.literal("geoArea"), geoArea: polygonSchema }).strict(),
  z.object({ type: z.literal("all") }).strict(),
]);

const severity = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const alertType = z.enum(["disruption", "closure", "weather", "emergency", "general"]);

export const createServiceAlertSchema = z
  .object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    severity: severity.default("MEDIUM"),
    type: alertType,
    targeting: targetingSchema,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  })
  .strict()
  .refine((d) => !d.endsAt || d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const updateServiceAlertSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    message: z.string().min(1).max(2000).optional(),
    severity: severity.optional(),
    type: alertType.optional(),
    targeting: targetingSchema.optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .strict();
