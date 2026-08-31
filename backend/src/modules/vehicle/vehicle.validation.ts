import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const VEHICLE_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;

export const createVehicleSchema = z
  .object({
    registrationNumber: z.string().min(1).max(40),
    model: z.string().max(80).nullable().optional(),
    type: z.string().min(1).max(40),
    capacity: z.coerce.number().int().min(1),
    fuelType: z.string().max(40).nullable().optional(),
    gpsDeviceId: z.string().max(80).nullable().optional(),
    status: z.enum(VEHICLE_STATUSES).default("ACTIVE"),
    assignedDriver: idString.nullable().optional(),
    assignedConductor: idString.nullable().optional(),
    assignedRoute: idString.nullable().optional(),
    wheelchairAccessible: z.boolean().default(false),
    amenities: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

export const updateVehicleSchema = z
  .object({
    registrationNumber: z.string().min(1).max(40).optional(),
    model: z.string().max(80).nullable().optional(),
    type: z.string().min(1).max(40).optional(),
    capacity: z.coerce.number().int().min(1).optional(),
    fuelType: z.string().max(40).nullable().optional(),
    gpsDeviceId: z.string().max(80).nullable().optional(),
    status: z.enum(VEHICLE_STATUSES).optional(),
    assignedDriver: idString.nullable().optional(),
    assignedConductor: idString.nullable().optional(),
    assignedRoute: idString.nullable().optional(),
    wheelchairAccessible: z.boolean().optional(),
    amenities: z.record(z.string(), z.unknown()).nullable().optional(),
    statusNote: z.string().max(200).nullable().optional(),
  })
  .strict();

export const assignVehicleSchema = z
  .object({
    driverId: idString.nullable(),
    conductorId: idString.nullable(),
    routeId: idString.nullable(),
  })
  .strict();
