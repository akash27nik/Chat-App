import {createSlice} from '@reduxjs/toolkit';


const messageSlice = createSlice({
  name: "message",
  initialState:{
  messages:[]
  },

  reducers: { 
   setMessages: (state, action) => {
  if (Array.isArray(action.payload)) {
    state.messages = action.payload;
  } else if (action.payload) {
    // wrap single message object into an array
    state.messages = [...state.messages, action.payload];
  } else {
    state.messages = [];
  }
}

  }
  
})

export const {setMessages} = messageSlice.actions;
export default messageSlice.reducer;
