import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

/**
 * Marks unseen messages from sender → receiver as "seen"
 * and notifies sender in real-time.
 *
 * @param {String} senderId - The sender whose messages were seen
 * @param {String} receiverId - The receiver (the one who saw them)
 * @returns {Array} messageIds - IDs of messages that were marked seen
 */
export const markMessagesSeenHelper = async (senderId, receiverId) => {
  const unseenMessages = await Message.find({
    sender: senderId,
    receiver: receiverId,
    status: { $ne: "seen" },
  }).select("_id");

  if (unseenMessages.length === 0) return [];

  const messageIds = unseenMessages.map((m) => m._id);

  // Update DB
  await Message.updateMany(
    { _id: { $in: messageIds } },
    { $set: { status: "seen" } }
  );

  // Notify sender via socket if online
  const senderSocketId = getReceiverSocketId(senderId);
  if (senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen", {
      userId: receiverId,
      messageIds,
    });
  }

  return messageIds;
};

export const markMessagesDeliveredHelper = async (senderId, receiverId) => {
  try {
    const undelivered = await Message.find({
      sender: senderId,
      receiver: receiverId,
      status: "sent",
    });

    if (undelivered.length === 0) return;

    await Message.updateMany(
      { _id: { $in: undelivered.map((m) => m._id) } },
      { $set: { status: "delivered", "details.deliveredAt": new Date() } }
    );

    return undelivered.map((m) => m._id); // return updated message IDs
  } catch (err) {
    console.error("❌ markMessagesDeliveredHelper error:", err.message);
    throw err;
  }
};