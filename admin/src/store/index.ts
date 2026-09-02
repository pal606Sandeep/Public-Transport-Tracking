import { configureStore } from "@reduxjs/toolkit";
import session from "./slices/session.slice";
import ui from "./slices/ui.slice";

export const makeStore = () =>
  configureStore({
    reducer: { session, ui },
  });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
