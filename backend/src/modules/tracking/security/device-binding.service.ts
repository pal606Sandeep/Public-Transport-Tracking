import { Driver } from "../../driver/driver.model.js";
import { Device } from "../../../models/device.model.js";
import { AuditLog } from "../../../models/auditLog.model.js";
import { AppError } from "../../../utils/AppError.js";
import logger from "../../../utils/logger.js";

/**
 * P2-26 — cross-checks the device reporting a GPS fix against the driver's
 * single ACTIVE bound device (P1-16). Only enforced when the client sends a
 * `deviceId`; omitted entirely, this is a no-op (older/unmigrated clients).
 */
export const assertBoundDevice = async (driverId: string, deviceId?: string): Promise<void> => {
  if (!deviceId) return;

  const driver = await Driver.findById(driverId).select("user").lean();
  if (!driver) return; // caller already 404s on missing driver elsewhere

  const bound = await Device.findOne({ userId: driver.user, deviceId, status: "ACTIVE" }).lean();
  if (bound) return;

  await AuditLog.create({
    actorId: driverId,
    actorRole: "DRIVER",
    action: "TRACKING_DEVICE_MISMATCH",
    resource: "tracking",
    resourceId: driverId,
    meta: { deviceId },
    severity: "SECURITY",
  }).catch((err: Error) => {
    logger.error(`Failed to audit device mismatch: ${err.message}`);
  });

  throw AppError.forbidden(
    "GPS fix rejected: reporting device is not the driver's bound device",
    "DEVICE_NOT_BOUND"
  );
};
