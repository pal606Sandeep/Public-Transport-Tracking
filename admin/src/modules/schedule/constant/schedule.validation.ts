import { z } from "zod";
import { FREQUENCY_TYPES } from "./schedule.types";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  code: z.string().max(40).optional(),
  route: z.string().min(1, "Route is required"),
  vehicle: z.string().optional(),
  frequencyType: z.enum(FREQUENCY_TYPES).default("DAILY"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  departureTimes: z
    .string()
    .min(1, "At least one departure time")
    .refine(
      (s) =>
        s
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .every((t) => HHMM.test(t)),
      "Times must be HH:MM (24h), comma-separated"
    ),
  durationMin: z.coerce.number().int().min(1).default(60),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type ScheduleFormValues = z.input<typeof scheduleFormSchema>;
export type ScheduleFormParsed = z.output<typeof scheduleFormSchema>;

export const parseTimes = (s: string): string[] =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
