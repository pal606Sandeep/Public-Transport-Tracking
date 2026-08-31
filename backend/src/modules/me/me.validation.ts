import { z } from "zod";

export const requestAssignmentSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    reason: z.string().max(300).optional(),
  })
  .strict();

export const decideRequestSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    note: z.string().max(300).optional(),
  })
  .strict();

export const checkinSchema = z
  .object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    location: z.string().max(200).optional(),
  })
  .strict();
