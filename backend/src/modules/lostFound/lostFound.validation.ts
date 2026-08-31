import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const createLostFoundSchema = z
  .object({
    kind: z.enum(["LOST", "FOUND"]),
    title: z.string().min(2).max(200),
    description: z.string().min(3).max(4000),
    category: z.string().max(80).nullable().optional(),
    color: z.string().max(60).nullable().optional(),
    route: objectId.nullable().optional(),
    vehicle: objectId.nullable().optional(),
    trip: objectId.nullable().optional(),
    occurredAt: z.coerce.date(),
    reporterName: z.string().max(120).nullable().optional(),
    reporterContact: z.string().max(160).nullable().optional(),
    attachmentKeys: z.array(z.string().min(1).max(500)).max(10).optional(),
  })
  .strict();

export const listLostFoundQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    kind: z.enum(["LOST", "FOUND"]).optional(),
    status: z.enum(["OPEN", "MATCHED", "CLAIMED", "RETURNED", "CLOSED"]).optional(),
    route: objectId.optional(),
  })
  .strict();

export const matchQuery = z
  .object({ windowDays: z.coerce.number().int().min(1).max(30).default(3) })
  .strict();

export const assignLostFoundSchema = z
  .object({ assigneeId: objectId, note: z.string().max(500).optional() })
  .strict();

export const updateLostFoundSchema = z
  .object({
    status: z.enum(["OPEN", "MATCHED", "CLAIMED", "RETURNED", "CLOSED"]).optional(),
    note: z.string().max(1000).optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.note !== undefined, {
    message: "Provide status or note",
  });

export const confirmReturnSchema = z
  .object({
    matchId: objectId,
    returnedTo: z.string().min(1).max(160),
    note: z.string().max(1000).optional(),
  })
  .strict();

export const closeLostFoundSchema = z.object({ note: z.string().max(1000).optional() }).strict();
