import { z } from "zod";
import { COMPLAINT_CATEGORIES } from "./complaint.model.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const createComplaintSchema = z
  .object({
    category: z.enum(COMPLAINT_CATEGORIES),
    subject: z.string().min(3).max(200),
    description: z.string().min(5).max(4000),
    relatedTrip: objectId.nullable().optional(),
    relatedRoute: objectId.nullable().optional(),
    relatedVehicle: objectId.nullable().optional(),
    attachmentKeys: z.array(z.string().min(1).max(500)).max(10).optional(),
  })
  .strict();

export const listComplaintQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"]).optional(),
    category: z.enum(COMPLAINT_CATEGORIES).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignedTo: objectId.optional(),
  })
  .strict();

export const assignComplaintSchema = z
  .object({ assigneeId: objectId, note: z.string().max(500).optional() })
  .strict();

export const updateComplaintSchema = z
  .object({
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"]).optional(),
    note: z.string().max(1000).optional(),
  })
  .strict()
  .refine((v) => v.priority !== undefined || v.status !== undefined || v.note !== undefined, {
    message: "Provide at least one of priority, status, note",
  });

export const escalateComplaintSchema = z
  .object({ assigneeId: objectId.optional(), reason: z.string().min(3).max(500) })
  .strict();

export const resolveComplaintSchema = z.object({ note: z.string().min(3).max(2000) }).strict();

export const closeComplaintSchema = z.object({ note: z.string().max(1000).optional() }).strict();

export const attachmentSchema = z.object({ key: z.string().min(1).max(500) }).strict();

export const feedbackSchema = z
  .object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() })
  .strict();
