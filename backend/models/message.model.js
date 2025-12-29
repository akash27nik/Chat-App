import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    mediaUrl: {
      type: String,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },

    // ✅ NEW: System Message Flag
    isSystem: {
      type: Boolean,
      default: false,
    },

    // ✅ Pinned Message Field
    isPinned: {
      type: Boolean,
      default: false,
    },

    // Reactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],

    // Delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Permanently mark if sent while blocked
    blockedByReceiver: {
      type: Boolean,
      default: false,
    },

    // Reply to a message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Status Reply Support
    statusReplyToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Status",
      default: null,
    },
    statusReplyToMediaUrl: { type: String, default: "" },
    statusReplyToCaption: { type: String, default: "" },
    statusReplyToUserName: { type: String, default: "" },

    // ✅ NEW: Expiration Field for Disappearing Messages
    // If null, the message persists forever.
    // If a Date is set, MongoDB deletes it at that specific time.
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 },
    },

    // Details
    details: {
      sentAt: { type: Date, default: Date.now },
      deliveredAt: { type: Date },
      seenAt: { type: Date },
      device: { type: String, default: "Unknown" },
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;