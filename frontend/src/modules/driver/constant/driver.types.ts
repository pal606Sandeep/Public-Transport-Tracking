/* ---- assignment (GET /me/assignments) ---------------------------------- */

export interface AssignmentTrip {
  _id: string;
  status: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  vehicle: string | null; // registrationNumber (string) as-built
}

export interface Assignment {
  date: string;
  staffType: "DRIVER" | "CONDUCTOR";
  staffId: string;
  name: string;
  shift: { type?: string; start?: string | null; end?: string | null };
  assignedScheduleId: string | null;
  route: {
    _id?: string;
    routeNumber?: string;
    name?: string | null;
    stops?: unknown[];
  } | null;
  scheduledTrips: AssignmentTrip[];
}

/* ---- active trip (GET /me/active-trip, POST/PATCH /trips/:id) ---------- */

export interface ActiveTripStop {
  stopId: string;
  sequence: number;
  scheduledOffsetMinutes: number;
  name: string | null;
  code: string | null;
  location: { type: "Point"; coordinates: [number, number] } | null;
}

export interface ActiveTrip {
  _id: string;
  status: string;
  route: {
    _id?: string;
    routeNumber?: string;
    name?: string | null;
    geometry?: { type: "LineString"; coordinates: [number, number][] } | null;
    orderedStops: ActiveTripStop[];
  } | null;
  vehicle: string | null;
  driver: string | null;
  conductor: string | null;
  startedAt: string | null;
  currentStop: { _id: string; name: string; code?: string } | null;
  lastKnownPosition:
    | { type: "Point"; coordinates: [number, number]; at?: string | null }
    | null;
  checklist: Record<string, unknown> | null;
}

/** serializeTrip shape returned by start / pause / resume / end */
export interface TripBrief {
  _id: string;
  status: string;
  route: string;
  vehicle: string | null;
  driver: string | null;
  conductor: string | null;
  startTime?: string | null;
  endTime?: string | null;
  summary?: Record<string, unknown> | null;
}

/* ---- checklist -------------------------------------------------------- */

export const CHECKLIST_ITEMS = [
  "fuel",
  "tyres",
  "brakes",
  "lights",
  "documentsValid",
  "cleanliness",
] as const;
export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];
export type ChecklistInput = Partial<Record<ChecklistItem, boolean>>;

/* ---- performance (GET /drivers/me/performance) ---------------------- */

export interface DriverPerformance {
  driverId: string;
  name: string;
  employeeId: string;
  status: string;
  licenseExpiry: string | null;
  licenseExpiryDays: number | null;
  complaintsCount: number;
  metrics: {
    note?: string;
    onTimePct: number | null;
    tripsCompleted: number | null;
    delays: number | null;
  };
}

/* ---- GPS fix ------------------------------------------------------- */

export interface GpsFix {
  vehicleId: string;
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
  deviceId?: string;
}
