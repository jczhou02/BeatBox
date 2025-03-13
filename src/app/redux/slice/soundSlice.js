import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  soundOn: false,
};

const soundSlice = createSlice({
  name: 'sound',
  initialState,
  reducers: {
    toggleSound: (state) => {
      state.soundOn = !state.soundOn;
    },
    setSoundOn: (state, action) => {
      state.soundOn = action.payload;
    },
  },
});

export const { toggleSound, setSoundOn } = soundSlice.actions;

export default soundSlice.reducer;