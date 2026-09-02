import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** UI phase of the driver trip flow. Server status is separate (SCHEDULED…COMPLETED). */
export type TripPhase =
  | "idle"
  | "checklist"
  | "starting"
  | "active"
  | "paused"
  | "ending"
  | "summary";

interface ActiveTripState {
  tripId: string | null;
  phase: TripPhase;
  /** foreground GPS is not currently streaming (tab hidden / wake-lock lost) */
  trackingPaused: boolean;
  /** count of GPS fixes buffered locally awaiting flush */
  pendingFixes: number;
}

const initialState: ActiveTripState = {
  tripId: null,
  phase: "idle",
  trackingPaused: false,
  pendingFixes: 0,
};

const activeTripSlice = createSlice({
  name: "activeTrip",
  initialState,
  reducers: {
    tripPhaseSet(
      state,
      action: PayloadAction<{ tripId: string | null; phase: TripPhase }>
    ) {
      state.tripId = action.payload.tripId;
      state.phase = action.payload.phase;
    },
    tripCleared(state) {
      state.tripId = null;
      state.phase = "idle";
      state.trackingPaused = false;
      state.pendingFixes = 0;
    },
    trackingPausedSet(state, action: PayloadAction<boolean>) {
      state.trackingPaused = action.payload;
    },
    pendingFixesSet(state, action: PayloadAction<number>) {
      state.pendingFixes = action.payload;
    },
  },
});

export const {
  tripPhaseSet,
  tripCleared,
  trackingPausedSet,
  pendingFixesSet,
} = activeTripSlice.actions;
export default activeTripSlice.reducer;
