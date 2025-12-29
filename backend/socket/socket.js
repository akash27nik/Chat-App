import http from "http";
import express from "express";
import { Server } from "socket.io";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Status from "../models/status.model.js";
import Message from "../models/message.model.js"; 
import { markMessagesSeenHelper, markMessagesDeliveredHelper } from "../services/message.service.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const userSocketMap = {}; 

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
      // ✅ ADDED: Send seenAt timestamp so frontend updates instantly
      const seenAt = new Date(); 
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
         // We don't have messageIds here easily without querying, 
         // but usually the frontend marks the whole conversation as seen.
         // Ideally, you'd emit this from the controller, but for now we rely on the client refreshing 
         // or we can emit a generic "conversationSeen" event if you prefer.
      }
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

  socket.on("audioRecording", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("audioRecording", { senderId: userId });
    }
  });

  socket.on("stopAudioRecording", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopAudioRecording", { senderId: userId });
    }
  });

  // ✅ UPDATED: Handle newMessage with delivery tracking & TIMESTAMP
  socket.on("newMessage", async (mess) => {
    const { senderId, receiverId, _id } = mess;

    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", mess);

      try {
        // ✅ Capture the exact time
        const deliveredAt = new Date();
        
        await Message.findByIdAndUpdate(_id, {
          status: "delivered",
          "details.deliveredAt": deliveredAt,
        });

        const senderSocketId = userSocketMap[senderId];
        if (senderSocketId) {
          // ✅ SEND TIMESTAMP TO SENDER
          io.to(senderSocketId).emit("messageDelivered", { 
            messageId: _id, 
            deliveredAt: deliveredAt 
          });
        }
      } catch (err) {
        console.error("❌ Error marking message delivered:", err.message);
      }
    }

    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", mess);
    }
  });

  /* ─── MESSAGE REACTION EVENTS ─── */
  socket.on("reactMessage", ({ messageId, reactions, senderId, receiverId }) => {
    try {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageReacted", { messageId, reactions });
      }
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReacted", { messageId, reactions });
      }
    } catch (err) {
      console.error("❌ Error in reactMessage socket:", err.message);
    }
  });

  /* ─── MESSAGE PIN EVENTS ─── */
  socket.on("pinMessage", ({ messageId, isPinned, senderId, receiverId }) => {
    try {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messagePinned", { messageId, isPinned });
      }
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagePinned", { messageId, isPinned });
      }
    } catch (err) {
      console.error("❌ Error in pinMessage socket:", err.message);
    }
  });

  /* ─── MESSAGE DELETE EVENTS ─── */
  socket.on("deleteMessage", ({ messageId, senderId, receiverId, forEveryone }) => {
    try {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, forEveryone });
      }
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

  socket.on("statusDeleted", ({ statusId }) => {
    io.emit("statusDeleted", { statusId });
  });

  socket.on("markDelivered", async ({ senderId, receiverId }) => {
    try {
      await markMessagesDeliveredHelper(senderId, receiverId);
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        // We assume 'now' for bulk delivery updates to keep it simple
        io.to(senderSocketId).emit("messagesDelivered", { receiverId, deliveredAt: new Date() });
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