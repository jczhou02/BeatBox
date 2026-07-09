import { configureStore } from "@reduxjs/toolkit";
import soundSlice from "../slice/soundSlice";

const store = configureStore({
  reducer: {
    sound: soundSlice,
  },
});

export default store;