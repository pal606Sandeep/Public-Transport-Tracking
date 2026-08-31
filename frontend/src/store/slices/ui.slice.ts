import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  language: string;
  /** High-contrast, large-tap layout for the Driver/Conductor (Operations) area. */
  fieldMode: boolean;
}

const initialState: UiState = {
  theme: "system",
  language: "en",
  fieldMode: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    setFieldMode(state, action: PayloadAction<boolean>) {
      state.fieldMode = action.payload;
    },
  },
});

export const { setTheme, setLanguage, setFieldMode } = uiSlice.actions;
export default uiSlice.reducer;
