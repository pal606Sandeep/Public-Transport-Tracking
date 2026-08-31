import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const SHIFT_TYPES = ["MORNING", "EVENING", "NIGHT", "SPLIT"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"] as const;

export const createDriverSchema = z
  .object({
    user: idString,
    name: z.string().min(1).max(120),
    phone: z.string().max(20).nullable().optional(),
    employeeId: z.string().min(1).max(40),
    licenseNumber: z.string().min(1).max(60),
    licenseType: z.string().max(40).nullable().optional(),
    licenseExpiry: z.coerce.date().nullable().optional(),
    joiningDate: z.coerce.date().nullable().optional(),
    status: z.enum(STATUSES).default("ACTIVE"),
    shift: z
      .object({
        type: z.enum(SHIFT_TYPES).default("MORNING"),
        start: z.string().max(10).nullable().optional(),
        end: z.string().max(10).nullable().optional(),
      })
      .default({ type: "MORNING" }),
    assigned: z
      .object({
        vehicleId: idString.nullable().optional(),
        routeId: idString.nullable().optional(),
        scheduleId: idString.nullable().optional(),
      })
      .optional(),
  })
  .strict();

export const updateDriverSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    phone: z.string().max(20).nullable().optional(),
    employeeId: z.string().min(1).max(40).optional(),
    licenseNumber: z.string().min(1).max(60).optional(),
    licenseType: z.string().max(40).nullable().optional(),
    licenseExpiry: z.coerce.date().nullable().optional(),
    joiningDate: z.coerce.date().nullable().optional(),
    status: z.enum(STATUSES).optional(),
    shift: z
      .object({
        type: z.enum(SHIFT_TYPES).optional(),
        start: z.string().max(10).nullable().optional(),
        end: z.string().max(10).nullable().optional(),
      })
      .optional(),
  })
  .strict();

export const assignDriverSchema = z
  .object({
    vehicleId: idString.nullable(),
    routeId: idString.nullable(),
    scheduleId: idString.nullable(),
  })
  .strict();

export const setDriverStatusSchema = z
  .object({
    status: z.enum(STATUSES),
  })
  .strict();

export const recordAttendanceSchema = z
  .object({
    date: z.coerce.date(),
    checkIn: z.coerce.date().nullable().optional(),
    checkOut: z.coerce.date().nullable().optional(),
  })
  .strict();
