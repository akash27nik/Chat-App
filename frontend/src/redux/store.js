import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSlice"
import messageSlice from "./messageSlice"
import unreadReducer from "./unreadSlice"


export const store = configureStore({
  reducer: {
    user: userSlice,
    message: messageSlice,
    unread: unreadReducer
  }
})