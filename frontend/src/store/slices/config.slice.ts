import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Shape of GET /api/v1/config (as-built). */
export interface ClientConfig {
  gpsSendIntervalSeconds: number;
  geofenceRadiusMeters: number;
  etaThresholds: Record<string, number>;
  delayThresholds: { onTime: number; delayed: number; severe: number };
  mapTileSource: string;
  supportedLanguages: string[];
  minSupportedAppVersion: string;
  featureFlags: Record<string, boolean>;
  vapidPublicKey: string;
  serverTime: number;
}

interface ConfigState {
  loaded: boolean;
  value: ClientConfig | null;
  /** serverTime - Date.now() at load, for clock-skew correction. */
  clockSkewMs: number;
}

const initialState: ConfigState = {
  loaded: false,
  value: null,
  clockSkewMs: 0,
};

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    configLoaded(state, action: PayloadAction<ClientConfig>) {
      state.value = action.payload;
      state.loaded = true;
      state.clockSkewMs = action.payload.serverTime - Date.now();
    },
  },
});

export const { configLoaded } = configSlice.actions;
export default configSlice.reducer;
