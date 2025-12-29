import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },

  userName: {
    type: String,
    required: true,
    unique: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: "",
  },
  lastSeen: {
     type: Date, default: Date.now 
  },
  
  // ✅ New Fields for Chat Actions
  blockedUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  archivedUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  favoriteUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  markedUnreadUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ]

}, { timestamps: true }); 

const User = mongoose.model("User", userSchema);
export default User;