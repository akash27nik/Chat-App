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
    typingUsers: {}, // { userId: true/false }
    recordingUsers: {}, // { userId: true/false }
    drafts: {} // ✅ ADDED: { userId: "draft text..." }
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

    // Recording state
    setRecording: (state, action) => {
      const { userId, isRecording } = action.payload;
      if (isRecording) {
        state.recordingUsers[userId] = true;
      } else {
        delete state.recordingUsers[userId];
      }
    },

    // ✅ ADDED: Set Draft Message
    setDraft: (state, action) => {
      const { userId, message } = action.payload;
      if (message && message.trim().length > 0) {
        state.drafts[userId] = message;
      } else {
        delete state.drafts[userId];
      }
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
  setRecording,
  setDraft, // ✅ Exported
  updateUserListOrder
} = userSlice.actions;

export default userSlice.reducer;