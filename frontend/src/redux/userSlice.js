// userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    otherUsers: [], // ✅ start as empty array
    selectedUser: null,
    socket: null,
    onlineUsers: [],
    typingUsers: {} // { userId: true/false }
  },

  reducers: {
    setUserData: (state, action) => { state.userData = action.payload; },
    setOtherUsers: (state, action) => {
      // ✅ Always store an array
      state.otherUsers = Array.isArray(action.payload) ? action.payload : [];
    },
    setSelectedUser: (state, action) => { state.selectedUser = action.payload; },
    setSocket: (state, action) => { state.socket = action.payload; },
    setOnlineUsers: (state, action) => {
      // ✅ Always store an array
      state.onlineUsers = Array.isArray(action.payload) ? action.payload : [];
    },

    // Typing state
    setTyping: (state, action) => {
      const { userId, isTyping } = action.payload;
      state.typingUsers[userId] = isTyping;
    },

    // ✅ Move latest messaged user to the top
    updateUserListOrder: (state, action) => {
      const userId = action.payload;
      const index = state.otherUsers.findIndex((u) => u._id === userId);
      if (index > -1) {
        const [user] = state.otherUsers.splice(index, 1);
        state.otherUsers.unshift(user);
      }
    }
  }
});

export const {
  setUserData,
  setOtherUsers,
  setSelectedUser,
  setSocket,
  setOnlineUsers,
  setTyping,
  updateUserListOrder
} = userSlice.actions;

export default userSlice.reducer;
