import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Normalised live view of one vehicle, fed by REST snapshots + socket events. */
export interface LiveVehicle {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  status?: string;
  routeId?: string | null;
  tripId?: string | null;
  currentStopId?: string | null;
  nextStopId?: string | null;
  etaSeconds?: number | null;
  occupancyLevel?: string | null;
  delayStatus?: string | null;
  updatedAt: number;
}

interface LiveVehiclesState {
  byId: Record<string, LiveVehicle>;
}

const initialState: LiveVehiclesState = { byId: {} };

const liveVehiclesSlice = createSlice({
  name: "liveVehicles",
  initialState,
  reducers: {
    vehicleUpserted(
      state,
      action: PayloadAction<Partial<LiveVehicle> & { vehicleId: string }>
    ) {
      const prev = state.byId[action.payload.vehicleId];
      state.byId[action.payload.vehicleId] = {
        ...prev,
        ...action.payload,
        lat: action.payload.lat ?? prev?.lat ?? 0,
        lng: action.payload.lng ?? prev?.lng ?? 0,
        updatedAt: action.payload.updatedAt ?? Date.now(),
      };
    },
    vehiclesSeeded(state, action: PayloadAction<LiveVehicle[]>) {
      for (const v of action.payload) state.byId[v.vehicleId] = v;
    },
    vehiclesCleared(state) {
      state.byId = {};
    },
    vehicleRemoved(state, action: PayloadAction<string>) {
      delete state.byId[action.payload];
    },
  },
});

export const {
  vehicleUpserted,
  vehiclesSeeded,
  vehiclesCleared,
  vehicleRemoved,
} = liveVehiclesSlice.actions;
export default liveVehiclesSlice.reducer;
