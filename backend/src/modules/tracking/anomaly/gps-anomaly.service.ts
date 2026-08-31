import { trackingConfig } from "../config/tracking.config.js";
import { getDistanceInMeters } from "../../../utils/distance.util.js";
import logger from "../../../utils/logger.js";

export interface AnomalyResult {
  isAnomaly: boolean;
  reason?: string;
  details?: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

interface LastFix {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
}

const lastFixes = new Map<string, LastFix>();
const GPS_ANOMALY_CACHE_TTL = 300_000;

export const detectGPSAnomaly = (
  vehicleId: string,
  latitude: number,
  longitude: number,
  speed: number,
  timestamp: number,
  accuracy: number
): AnomalyResult => {
  const now = Date.now();

  if (accuracy > trackingConfig.gps.accuracyThresholdMeters * 5) {
    return {
      isAnomaly: true,
      reason: "INVALID_GPS",
      details: `Accuracy ${accuracy}m exceeds maximum threshold`,
      severity: "LOW",
    };
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      isAnomaly: true,
      reason: "INVALID_GPS",
      details: "Non-finite coordinates received",
      severity: "HIGH",
    };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      isAnomaly: true,
      reason: "INVALID_GPS",
      details: `Coordinates out of range: [${latitude}, ${longitude}]`,
      severity: "HIGH",
    };
  }

  if (speed > trackingConfig.gps.maxSpeedKmh) {
    return {
      isAnomaly: true,
      reason: "IMPOSSIBLE_SPEED",
      details: `Speed ${speed} km/h exceeds max ${trackingConfig.gps.maxSpeedKmh} km/h`,
      severity: "MEDIUM",
    };
  }

  const lastFix = lastFixes.get(vehicleId);

  if (lastFix) {
    if (timestamp < lastFix.timestamp - trackingConfig.gps.duplicateThresholdSeconds * 1000) {
      return {
        isAnomaly: true,
        reason: "OUT_OF_ORDER",
        details: `Timestamp ${timestamp} is older than last fix ${lastFix.timestamp}`,
        severity: "LOW",
      };
    }

    if (Math.abs(timestamp - lastFix.timestamp) < trackingConfig.gps.duplicateThresholdSeconds * 1000) {
      const dist = getDistanceInMeters(latitude, longitude, lastFix.latitude, lastFix.longitude);
      if (dist < 1) {
        return {
          isAnomaly: true,
          reason: "DUPLICATE_GPS",
          details: `Duplicate fix within ${trackingConfig.gps.duplicateThresholdSeconds}s`,
          severity: "LOW",
        };
      }
    }

    const timeDiffSeconds = Math.abs(timestamp - lastFix.timestamp) / 1000;
    if (timeDiffSeconds > 0) {
      const distanceMeters = getDistanceInMeters(latitude, longitude, lastFix.latitude, lastFix.longitude);
      const impliedSpeedKmh = (distanceMeters / timeDiffSeconds) * 3.6;

      if (impliedSpeedKmh > trackingConfig.gps.maxSpeedKmh * 1.5) {
        logger.warn(`Suspicious movement detected for vehicle ${vehicleId}`, {
          vehicleId,
          distanceMeters: Math.round(distanceMeters),
          timeDiffSeconds: Math.round(timeDiffSeconds),
          impliedSpeedKmh: Math.round(impliedSpeedKmh),
        });
        return {
          isAnomaly: true,
          reason: "SUSPICIOUS_MOVEMENT",
          details: `Implied speed ${Math.round(impliedSpeedKmh)} km/h over ${Math.round(distanceMeters)}m in ${Math.round(timeDiffSeconds)}s`,
          severity: "HIGH",
        };
      }
    }
  }

  lastFixes.set(vehicleId, { latitude, longitude, speed, timestamp });

  if (lastFixes.size > 10000) {
    const cutoff = now - GPS_ANOMALY_CACHE_TTL;
    for (const [key, fix] of lastFixes) {
      if (fix.timestamp < cutoff) lastFixes.delete(key);
    }
  }

  return { isAnomaly: false, severity: "LOW" };
};

export const isDuplicateFix = (
  vehicleId: string,
  timestamp: number
): boolean => {
  const lastFix = lastFixes.get(vehicleId);
  if (!lastFix) return false;
  return Math.abs(timestamp - lastFix.timestamp) < trackingConfig.gps.duplicateThresholdSeconds * 1000;
};

export const clearAnomalyCache = (vehicleId: string): void => {
  lastFixes.delete(vehicleId);
};
