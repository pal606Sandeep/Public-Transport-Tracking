import { z } from "zod";

export const dispatchMessageSchema = z.object({
  message: z.string().min(1).max(500),
  priority: z.enum(["NORMAL", "URGENT"]).optional(),
  targetVehicleId: z.string().optional(),
});

export const tripForceEndSchema = z.object({
  reason: z.string().min(1).max(500),
});