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

    // ✅ Reactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],

    // ✅ Delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],

    // ✅ Reply feature
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // ✅ Message Details
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
