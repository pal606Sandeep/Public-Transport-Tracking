import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM 24-hour format");

export const createScheduleSchema = z
  .object({
    name: z.string().min(1).max(120),
    code: z.string().max(40).nullable().optional(),
    route: idString,
    vehicle: idString.nullable().optional(),
    driver: idString.nullable().optional(),
    conductor: idString.nullable().optional(),
    frequencyType: z.enum(["DAILY", "WEEKLY", "WEEKEND", "HOLIDAY", "SPECIAL"]).default("DAILY"),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    departureTimes: z.array(hhmm).min(1),
    durationMin: z.coerce.number().int().min(1).default(60),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateScheduleSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    code: z.string().max(40).nullable().optional(),
    route: idString.optional(),
    vehicle: idString.nullable().optional(),
    driver: idString.nullable().optional(),
    conductor: idString.nullable().optional(),
    frequencyType: z.enum(["DAILY", "WEEKLY", "WEEKEND", "HOLIDAY", "SPECIAL"]).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    departureTimes: z.array(hhmm).min(1).optional(),
    durationMin: z.coerce.number().int().min(1).optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const generateScheduleSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .strict();
