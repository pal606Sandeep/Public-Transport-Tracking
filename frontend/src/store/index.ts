import { configureStore } from "@reduxjs/toolkit";
import session from "./slices/session.slice";
import config from "./slices/config.slice";
import ui from "./slices/ui.slice";
import activeTrip from "./slices/activeTrip.slice";
import liveVehicles from "./slices/liveVehicles.slice";

export const makeStore = () =>
  configureStore({
    reducer: { session, config, ui, activeTrip, liveVehicles },
  });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
