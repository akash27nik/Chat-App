import mongoose from "mongoose";

const statusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // ✅ New Fields for Text Status
  type: {
    type: String,
    enum: ["media", "text"],
    default: "media",
  },
  text: {
    type: String, // Content for text status
  },
  font: {
    type: String,
    default: "font-sans",
  },
  color: {
    type: String,
    default: "#000000", // Background color
  },
  
  // ✅ Media is now optional (required only if type is 'media')
  mediaUrl: {
    type: String,
    required: function() { return this.type === 'media'; } 
  },
  
  caption: {
    type: String,
    default: "",
  },
  musicUrl: {
    type: String,
    default: "",
  },
  musicStartTime: {
    type: Number,
    default: 0,
  },
  musicDuration: {
    type: Number,
    default: 15, 
  },
  isMuted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 Hours TTL
  },
  viewers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  likes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      likedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  replies: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      message: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Status = mongoose.model("Status", statusSchema);
export default Status;