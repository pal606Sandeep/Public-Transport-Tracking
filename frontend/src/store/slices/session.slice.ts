import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types";

export type SessionStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "guest"
  | "unauthenticated";

interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  /** Mirror of the in-memory token, for UI gating only — never persisted. */
  hasToken: boolean;
}

const initialState: SessionState = {
  status: "idle",
  user: null,
  hasToken: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionLoading(state) {
      state.status = "loading";
    },
    sessionEstablished(state, action: PayloadAction<{ user: AuthUser }>) {
      state.user = action.payload.user;
      state.hasToken = true;
      state.status =
        action.payload.user.role === "GUEST" ? "guest" : "authenticated";
    },
    sessionCleared(state) {
      state.user = null;
      state.hasToken = false;
      state.status = "unauthenticated";
    },
    sessionUserPatched(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
});

export const {
  sessionLoading,
  sessionEstablished,
  sessionCleared,
  sessionUserPatched,
} = sessionSlice.actions;

export default sessionSlice.reducer;
