import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const TRIP_STATUSES = [
  "SCHEDULED",
  "ASSIGNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "MISSED",
] as const;

export const createTripSchema = z
  .object({
    schedule: idString.nullable().optional(),
    route: idString,
    vehicle: idString.nullable().optional(),
    driver: idString.nullable().optional(),
    conductor: idString.nullable().optional(),
    scheduledStartAt: z.coerce.date().nullable().optional(),
    scheduledEndAt: z.coerce.date().nullable().optional(),
  })
  .strict();

export const assignTripSchema = z
  .object({
    driverId: idString.nullable(),
    vehicleId: idString.nullable(),
    conductorId: idString.nullable(),
  })
  .strict();

export const cancelTripSchema = z
  .object({
    reason: z.string().min(1).max(200).default("Trip cancelled"),
  })
  .strict();

export const transitionSchema = z
  .object({
    status: z.enum(TRIP_STATUSES),
  })
  .strict();

export const scheduleTripCreateSchema = z
  .object({
    tripIds: z.array(idString).min(1),
    status: z.enum(["CANCELLED", "MISSED"]),
  })
  .strict();

// P1-28

export const tripActionSchema = z
  .object({
    action: z.enum(["pause", "resume", "end"]),
  })
  .strict();

// P1-29

export const startTripSchema = z.object({}).strict();

export const checklistSchema = z
  .object({
    fuel: z.boolean().optional(),
    tyres: z.boolean().optional(),
    brakes: z.boolean().optional(),
    lights: z.boolean().optional(),
    documentsValid: z.boolean().optional(),
    cleanliness: z.boolean().optional(),
  })
  .strict();

// P1-46

export const passengerCountItemSchema = z
  .object({
    idempotencyKey: z.string().min(1).max(120),
    stop: idString.optional(),
    boarded: z.number().min(0).optional(),
    alighted: z.number().min(0).optional(),
    recordedAt: z.string().optional(),
  })
  .strict();

export const passengerCountBulkSchema = z
  .object({
    items: z.array(passengerCountItemSchema).min(1).max(50),
  })
  .strict();

export const reconciliationSchema = z
  .object({
    ticketsIssued: z.number().min(0),
    cashCollected: z.number().min(0),
    digitalCollected: z.number().min(0),
  })
  .strict();
