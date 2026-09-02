import { z } from "zod";
import { VEHICLE_STATUSES } from "./vehicle.types";

export const vehicleFormSchema = z.object({
  registrationNumber: z.string().min(1, "Registration is required").max(40),
  model: z.string().max(80).optional(),
  type: z.string().min(1, "Type is required").max(40),
  capacity: z.coerce.number().int().min(1, "At least 1 seat"),
  fuelType: z.string().max(40).optional(),
  gpsDeviceId: z.string().max(80).optional(),
  status: z.enum(VEHICLE_STATUSES).default("ACTIVE"),
  assignedRoute: z.string().optional(),
  wheelchairAccessible: z.boolean().default(false),
});

export type VehicleFormValues = z.input<typeof vehicleFormSchema>;
export type VehicleFormParsed = z.output<typeof vehicleFormSchema>;
