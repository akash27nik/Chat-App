import { createSlice } from "@reduxjs/toolkit";

const unreadSlice = createSlice({
  name: "unread",
  initialState: {
    unreadMessages: {} // { userId: { count: number, lastUpdated: timestamp } }
  },
  reducers: {
    // Set unread count explicitly
    setUnreadMessages: (state, action) => {
      const { userId, count } = action.payload;
      state.unreadMessages[userId] = {
        count,
        lastUpdated: Date.now()
      };
    },
    // Increment unread count by 1 (or by count if provided)
    incrementUnread: (state, action) => {
      const { userId, count = 1 } = action.payload;
      const current = state.unreadMessages[userId];
      state.unreadMessages[userId] = {
        count: current ? current.count + count : count,
        lastUpdated: Date.now()
      };
    },
    // Reset unread count to zero
    resetUnread: (state, action) => {
      const userId = action.payload;
      if (state.unreadMessages[userId]) {
        state.unreadMessages[userId].count = 0;
        state.unreadMessages[userId].lastUpdated = Date.now();
      }
    }
  }
});

export const { setUnreadMessages, incrementUnread, resetUnread } = unreadSlice.actions;
export default unreadSlice.reducer;
