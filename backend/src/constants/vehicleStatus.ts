export const VEHICLE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
  OFFLINE: "OFFLINE",
  RETIRED: "RETIRED",
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const VEHICLE_LIVE_STATUS = {
  MOVING: "MOVING",
  STOPPED: "STOPPED",
  DELAYED: "DELAYED",
  OFFLINE: "OFFLINE",
} as const;

export type VehicleLiveStatus =
  (typeof VEHICLE_LIVE_STATUS)[keyof typeof VEHICLE_LIVE_STATUS];