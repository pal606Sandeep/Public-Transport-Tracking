import { z } from "zod";
import { CONDUCTOR_STATUSES, SHIFT_TYPES } from "./conductor.types";

export const conductorFormSchema = z.object({
  user: z.string().min(1, "Linked user account is required"),
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(20).optional(),
  employeeId: z.string().min(1, "Employee ID is required").max(40),
  joiningDate: z.string().optional(),
  status: z.enum(CONDUCTOR_STATUSES).default("ACTIVE"),
  shiftType: z.enum(SHIFT_TYPES).default("MORNING"),
  shiftStart: z.string().max(10).optional(),
  shiftEnd: z.string().max(10).optional(),
});

export type ConductorFormValues = z.input<typeof conductorFormSchema>;
export type ConductorFormParsed = z.output<typeof conductorFormSchema>;
