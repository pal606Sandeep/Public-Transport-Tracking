import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const currency = z.string().min(3).max(8).default("INR");

export const createFareSchema = z
  .object({
    name: z.string().min(1).max(120),
    type: z.enum(["ROUTE", "DISTANCE", "STAGE"]),
    isActive: z.boolean().default(true),
    route: idString.nullable().optional(),
    fromStop: idString.nullable().optional(),
    toStop: idString.nullable().optional(),
    amount: z.number().min(0),
    distanceFromKm: z.number().nonnegative().nullable().optional(),
    distanceToKm: z.number().nonnegative().nullable().optional(),
    priority: z.number().int().default(0),
  })
  .strict();

export const updateFareSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    type: z.enum(["ROUTE", "DISTANCE", "STAGE"]).optional(),
    isActive: z.boolean().optional(),
    route: idString.nullable().optional(),
    fromStop: idString.nullable().optional(),
    toStop: idString.nullable().optional(),
    amount: z.number().min(0).optional(),
    distanceFromKm: z.number().nonnegative().nullable().optional(),
    distanceToKm: z.number().nonnegative().nullable().optional(),
    priority: z.number().int().optional(),
  })
  .strict();

export const createFareRuleSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(300).nullable().optional(),
    baseFare: z.number().min(0),
    perStopFare: z.number().min(0),
    perKmFare: z.number().nonnegative().nullable().optional(),
    minimumFare: z.number().nonnegative().nullable().optional(),
    currency,
    acceptedPaymentMethods: z.array(z.string()).default(["QR", "CASH", "CARD", "UPI"]),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateFareRuleSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(300).nullable().optional(),
    baseFare: z.number().min(0).optional(),
    perStopFare: z.number().min(0).optional(),
    perKmFare: z.number().nonnegative().nullable().optional(),
    minimumFare: z.number().nonnegative().nullable().optional(),
    currency: currency.optional(),
    acceptedPaymentMethods: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const createConcessionSchema = z
  .object({
    name: z.string().min(1).max(120),
    code: z.string().min(1).max(40),
    type: z.enum(["STUDENT", "SENIOR", "DISABLED", "VETERAN", "LOW_INCOME", "GENERAL"]),
    discountPercent: z.number().min(0).max(100),
    isActive: z.boolean().default(true),
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    maxPerDay: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const updateConcessionSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    code: z.string().min(1).max(40).optional(),
    type: z.enum(["STUDENT", "SENIOR", "DISABLED", "VETERAN", "LOW_INCOME", "GENERAL"]).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    maxPerDay: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const createPassSchema = z
  .object({
    name: z.string().min(1).max(120),
    type: z.enum(["DAILY", "WEEKLY", "MONTHLY", "STUDENT", "SENIOR"]),
    price: z.number().min(0),
    currency,
    durationDays: z.number().int().positive().nullable().optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    isActive: z.boolean().default(true),
    unlimited: z.boolean().default(true),
  })
  .strict();

export const updatePassSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    type: z.enum(["DAILY", "WEEKLY", "MONTHLY", "STUDENT", "SENIOR"]).optional(),
    price: z.number().min(0).optional(),
    currency: currency.optional(),
    durationDays: z.number().int().positive().nullable().optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
    unlimited: z.boolean().optional(),
  })
  .strict();

export const calculateFareSchema = z
  .object({
    routeId: idString.optional(),
    boardingStopId: idString,
    destinationStopId: idString,
    passengerCategory: z.enum(["ADULT", "CHILD", "STUDENT", "SENIOR", "DISABLED", "VETERAN"]).default("ADULT"),
    concessionId: idString.optional(),
    distanceKm: z.number().nonnegative().optional(),
  })
  .strict();
