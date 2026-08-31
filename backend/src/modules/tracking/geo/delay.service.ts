import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import { publishEvent } from "../event-bus.service.js";
import logger from "../../../utils/logger.js";

export type DelayStatus = "EARLY" | "ON_TIME" | "DELAYED" | "SEVERELY_DELAYED";

export interface DelayResult {
  vehicleId: string;
  tripId: string;
  routeId: string;
  delayStatus: DelayStatus;
  delaySeconds: number;
  scheduledArrival: number;
  predictedArrival: number;
  nextStopId: string;
}

const lastDelayStatus = new Map<string, DelayStatus>();

export const detectDelay = async (
  vehicleId: string,
  tripId: string,
  routeId: string,
  nextStopId: string,
  scheduledArrivalMs: number,
  predictedArrivalMs: number
): Promise<DelayResult | null> => {
  const settings = await getTrackingSettings();
  const delaySeconds = Math.round((predictedArrivalMs - scheduledArrivalMs) / 1000);
  const absDelay = Math.abs(delaySeconds);

  let delayStatus: DelayStatus;
  if (delaySeconds < -settings.delayThresholds.onTime) {
    delayStatus = "EARLY";
  } else if (absDelay <= settings.delayThresholds.onTime) {
    delayStatus = "ON_TIME";
  } else if (absDelay <= settings.delayThresholds.delayed) {
    delayStatus = "DELAYED";
  } else {
    delayStatus = "SEVERELY_DELAYED";
  }

  const statusKey = `${vehicleId}:${tripId}:${nextStopId}`;
  const prevStatus = lastDelayStatus.get(statusKey);
  lastDelayStatus.set(statusKey, delayStatus);

  if (prevStatus !== delayStatus && (delayStatus === "DELAYED" || delayStatus === "SEVERELY_DELAYED")) {
    logger.warn(`Vehicle ${vehicleId} delay detected: ${delayStatus}`, {
      vehicleId,
      tripId,
      delayStatus,
      delaySeconds,
    });

    await publishEvent("VEHICLE_DELAYED", {
      vehicleId,
      tripId,
      routeId,
      delayStatus,
      delaySeconds,
      scheduledArrival: scheduledArrivalMs,
      predictedArrival: predictedArrivalMs,
      nextStopId,
      timestamp: Date.now(),
    });
  }

  return {
    vehicleId,
    tripId,
    routeId,
    delayStatus,
    delaySeconds,
    scheduledArrival: scheduledArrivalMs,
    predictedArrival: predictedArrivalMs,
    nextStopId,
  };
};

export const getDelayStatus = (vehicleId: string, tripId: string, stopId: string): DelayStatus | null => {
  return lastDelayStatus.get(`${vehicleId}:${tripId}:${stopId}`) ?? null;
};
