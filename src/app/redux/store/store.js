import { configureStore } from "@reduxjs/toolkit";
import darkmodeSlice from "../slice/darkModeSlice";

const store = configureStore({
  reducer: {
    darkmode: darkmodeSlice,
  },
});

export default store;