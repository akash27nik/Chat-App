import http from "http";
import express from "express";
import { Server } from "socket.io";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Status from "../models/status.model.js";
import Message from "../models/message.model.js"; // ✅ import Message model
import { markMessagesSeenHelper, markMessagesDeliveredHelper } from "../services/message.service.js";


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    userSocketMap[userId] = socket.id;

    try {
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
    } catch (err) {
      console.error("❌ Error updating lastSeen:", err.message);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }

  /* ─── MESSAGE EVENTS ─── */
  socket.on("markSeen", async ({ senderId, receiverId }) => {
    try {
      await markMessagesSeenHelper(senderId, receiverId);
    } catch (err) {
      console.error("❌ Error in markSeen socket:", err.message);
    }
  });

  socket.on("typing", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
    }
  });

  // ✅ Updated: handle newMessage with delivery tracking
  socket.on("newMessage", async (mess) => {
    const { senderId, receiverId, _id } = mess;

    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      // 🔹 Send message to receiver
      io.to(receiverSocketId).emit("newMessage", mess);

      // 🔹 Mark message as delivered in DB
      try {
        await Message.findByIdAndUpdate(_id, {
          status: "delivered",
          "details.deliveredAt": new Date(),
        });

        // Notify sender to update UI (double grey ticks)
        const senderSocketId = userSocketMap[senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageDelivered", { messageId: _id });
        }
      } catch (err) {
        console.error("❌ Error marking message delivered:", err.message);
      }
    }

    // Always send back to sender (so UI updates instantly with sent tick)
    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", mess);
    }
  });

  /* ─── MESSAGE REACTION EVENTS ─── */
  socket.on("reactMessage", ({ messageId, reactions, senderId, receiverId }) => {
    try {
      // Send to receiver if online
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageReacted", { messageId, reactions });
      }

      // Send back to sender too (so it updates instantly)
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReacted", { messageId, reactions });
      }
    } catch (err) {
      console.error("❌ Error in reactMessage socket:", err.message);
    }
  });

  /* ─── MESSAGE DELETE EVENTS ─── */
  socket.on("deleteMessage", ({ messageId, senderId, receiverId, forEveryone }) => {
    try {
      // Notify receiver if online
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, forEveryone });
      }

      // Always notify sender (so their UI updates too)
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", { messageId, forEveryone });
      }
    } catch (err) {
      console.error("❌ Error in deleteMessage socket:", err.message);
    }
  });

  /* ─── STATUS EVENTS ─── */
  socket.on("statusViewed", async ({ statusId, viewerId }) => {
    try {
      const status = await Status.findById(statusId).populate("user", "_id");
      if (!status) return;

      const ownerId = status.user._id.toString();
      const ownerSocketId = userSocketMap[ownerId];

      if (ownerSocketId) {
        io.to(ownerSocketId).emit("statusViewed", {
          statusId,
          viewers: status.viewers,
        });
      }
    } catch (err) {
      console.error("statusViewed socket error:", err.message);
    }
  });

  // ✅ NEW: Handle statusDeleted
  socket.on("statusDeleted", ({ statusId }) => {
    io.emit("statusDeleted", { statusId });
  });

  socket.on("markDelivered", async ({ senderId, receiverId }) => {
  try {
    await markMessagesDeliveredHelper(senderId, receiverId);

    // notify sender to update all "sent" → "delivered"
    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesDelivered", { receiverId });
    }
  } catch (err) {
    console.error("❌ Error in markDelivered socket:", err.message);
  }
});


  /* ─── DISCONNECT ─── */
  socket.on("disconnect", async () => {
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      delete userSocketMap[userId];

      try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
      } catch (err) {
        console.error("❌ Error updating lastSeen on disconnect:", err.message);
      }

      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      io.emit("stopTyping", { senderId: userId });
    }
  });
});

export { app, server, io };
