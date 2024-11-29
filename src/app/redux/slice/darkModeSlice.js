import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isDark: false,
};

const darkModeSlice = createSlice({
  name: 'darkmode',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDark = !state.isDark;
    },
    setDarkMode: (state, action) => {
      state.isDark = action.payload;
    },
  },
});

export const { toggleDarkMode, setDarkMode } = darkModeSlice.actions;

export default darkModeSlice.reducer;