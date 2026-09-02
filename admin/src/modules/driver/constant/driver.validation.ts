import { z } from "zod";
import { DRIVER_STATUSES, SHIFT_TYPES } from "./driver.types";

export const driverFormSchema = z.object({
  user: z.string().min(1, "Linked user account is required"),
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(20).optional(),
  employeeId: z.string().min(1, "Employee ID is required").max(40),
  licenseNumber: z.string().min(1, "License number is required").max(60),
  licenseType: z.string().max(40).optional(),
  licenseExpiry: z.string().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(DRIVER_STATUSES).default("ACTIVE"),
  shiftType: z.enum(SHIFT_TYPES).default("MORNING"),
  shiftStart: z.string().max(10).optional(),
  shiftEnd: z.string().max(10).optional(),
});

export type DriverFormValues = z.input<typeof driverFormSchema>;
export type DriverFormParsed = z.output<typeof driverFormSchema>;
