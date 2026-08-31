import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

export const gpsLocationSchema = z.object({
  vehicleId: idString,
  tripId: idString,
  driverId: idString,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(200).default(0),
  heading: z.number().min(0).max(360).default(0),
  accuracy: z.number().min(0).default(0),
  timestamp: z.number().positive(),
  deviceId: z.string().min(1).max(200).optional(),
}).strict();

export const bulkLocationSchema = z.object({
  locations: z.array(gpsLocationSchema).min(1).max(100),
}).strict();

export const heartbeatSchema = z.object({
  vehicleId: idString,
  tripId: idString.optional(),
  driverId: idString.optional(),
  timestamp: z.number().positive().optional(),
}).strict();

export const sosSchema = z.object({
  vehicleId: idString,
  tripId: idString,
  driverId: idString,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  message: z.string().max(500).optional(),
}).strict();

export const tripHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
}).strict();

export const occupancySchema = z.object({
  vehicleId: idString,
  tripId: idString,
  passengerCount: z.number().int().min(0),
}).strict();

export const sosAckSchema = z.object({
  vehicleId: idString,
  driverId: idString,
}).strict();

export type GPSLocationInput = z.infer<typeof gpsLocationSchema>;
export type BulkLocationInput = z.infer<typeof bulkLocationSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type SOSInput = z.infer<typeof sosSchema>;
export type TripHistoryQuery = z.infer<typeof tripHistoryQuerySchema>;
export type OccupancyInput = z.infer<typeof occupancySchema>;
export type SOSAckInput = z.infer<typeof sosAckSchema>;
