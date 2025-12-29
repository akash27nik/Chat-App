import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSlice";
import messageSlice from "./messageSlice";
import unreadReducer from "./unreadSlice";

export const store = configureStore({
  reducer: {
    user: userSlice,
    message: messageSlice,
    unread: unreadReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // ✅ Keep your existing socket configuration
      serializableCheck: {
        ignoredPaths: ["user.socket"],
        ignoredActions: ["user/setSocket"],
      },
      // ✅ Add this to fix the "took Xms" warning
      immutableCheck: {
        warnAfter: 120, // Increase warning threshold to 120ms
      },
    }),
});