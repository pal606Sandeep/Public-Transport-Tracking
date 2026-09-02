import { api } from "@/utils/apiClient";
import type {
  ActiveTrip,
  ChecklistInput,
  TripBrief,
} from "../constant/driver.types";

/** GET /api/v1/me/active-trip — 404 when there is none. */
export const getActiveTrip = async (): Promise<ActiveTrip | null> => {
  try {
    const res = await api.get<{ trip: ActiveTrip }>("/me/active-trip");
    return (res.data as { trip: ActiveTrip }).trip;
  } catch (e) {
    // 404 -> no active trip
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
};

/** GET /api/v1/trips/:id/resume-state — full active-trip payload for one trip. */
export const getResumeState = async (tripId: string): Promise<ActiveTrip> => {
  const res = await api.get<ActiveTrip>(`/trips/${tripId}/resume-state`);
  return res.data as ActiveTrip;
};

/** POST /api/v1/trips/:id/start  (Idempotency-Key required) */
export const startTrip = async (tripId: string): Promise<TripBrief> => {
  const res = await api.post<{ trip: TripBrief }>(
    `/trips/${tripId}/start`,
    undefined,
    { idempotent: true }
  );
  return (res.data as { trip: TripBrief }).trip;
};

/** PATCH /api/v1/trips/:id  { action: "pause" | "resume" | "end" }  (Idempotency-Key) */
export const tripAction = async (
  tripId: string,
  action: "pause" | "resume" | "end"
): Promise<TripBrief> => {
  const res = await api.patch<{ trip: TripBrief }>(
    `/trips/${tripId}`,
    { action },
    { idempotent: true }
  );
  return (res.data as { trip: TripBrief }).trip;
};

/** POST /api/v1/trips/:id/checklist */
export const submitChecklist = async (
  tripId: string,
  checklist: ChecklistInput
): Promise<Record<string, unknown>> => {
  const res = await api.post<Record<string, unknown>>(
    `/trips/${tripId}/checklist`,
    checklist
  );
  return res.data ?? {};
};

/** GET /api/v1/trips/:id/checklist-block -> { blocked } */
export const getChecklistBlock = async (
  tripId: string
): Promise<boolean> => {
  const res = await api.get<{ blocked: boolean }>(
    `/trips/${tripId}/checklist-block`
  );
  return Boolean(res.data?.blocked);
};
