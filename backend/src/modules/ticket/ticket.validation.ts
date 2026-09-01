import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createTicketSchema = z
  .object({
    route: idString.optional(),
    trip: idString.nullable().optional(),
    vehicle: idString.nullable().optional(),
    boardingStop: idString.optional(),
    destinationStop: idString.optional(),
    passengerCategory: z
      .enum(["ADULT", "CHILD", "STUDENT", "SENIOR", "DISABLED", "VETERAN"])
      .default("ADULT"),
    concessionId: idString.optional(),
    paymentMethod: z.string().default("CASH"),
    paid: z.boolean().default(false),
    distanceKm: z.number().nonnegative().optional(),
  })
  .strict();

export const validateTicketSchema = z
  .object({
    ticketCode: z.string().min(4).max(120).optional(),
  })
  .strict();

export const cancelTicketSchema = z
  .object({
    reason: z.string().max(300).nullable().optional(),
  })
  .strict();

export const purchasePassSchema = z
  .object({
    pass: idString,
  })
  .strict();

// P1-46 — conductor offline bulk ticket issue

export const bulkTicketItemSchema = createTicketSchema.extend({
  idempotencyKey: z.string().min(1).max(120),
  issuedAt: z.string().optional(),
});

export const bulkTicketsSchema = z
  .object({
    items: z.array(bulkTicketItemSchema).min(1).max(50),
  })
  .strict();
