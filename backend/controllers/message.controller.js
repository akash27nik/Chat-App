import uploadOnCloudinary from "../config/cloudinary.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { markMessagesSeenHelper } from "../services/message.service.js";
import User from "../models/user.model.js";

// ✅ Send new message
export const sendMessage = async (req, res) => {
  try {
    const sender = req.userId;
    const receiver = req.params.receiver;
    const { message, mediaUrl, isForwarded, replyTo } = req.body;

    let image;

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      image = uploadResult.secure_url;
    }

    if (mediaUrl) {
      image = mediaUrl;
    }

    const receiverSocketId = getReceiverSocketId(receiver);
    const status = receiverSocketId ? "delivered" : "sent";

    const newMessage = await Message.create({
      sender,
      receiver,
      message,
      image,
      status,
      isForwarded: isForwarded || false,
      replyTo: replyTo || null, // ✅ reply reference
      details: {
        sentAt: new Date(),
        device: req.headers["user-agent"] || "Unknown Device",
      },
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [sender, receiver] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [sender, receiver],
        messages: [newMessage._id],
      });
    } else {
      conversation.messages.push(newMessage._id);
      await conversation.save();
    }

    const senderUser = await User.findById(sender).select("name image");
    const receiverUser = await User.findById(receiver).select("name image");

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage.toObject(),
        senderName: senderUser?.name,
        senderImage: senderUser?.image,
        receiverName: receiverUser?.name,
        receiverImage: receiverUser?.image,
      });

      // ✅ Also update sender's message status to delivered
      io.to(getReceiverSocketId(sender)).emit("messageDelivered", {
        messageId: newMessage._id,
      });
    }

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Send Message error" });
  }
};

export const getMessageDetails = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate("sender", "name image")
      .populate("receiver", "name image")
      .populate("replyTo", "message sender image");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json({
      _id: message._id,
      sender: message.sender,
      receiver: message.receiver,
      message: message.message,
      image: message.image,
      isForwarded: message.isForwarded,
      replyTo: message.replyTo,
      details: message.details,
    });
  } catch (error) {
    console.error("Error getting message details:", error);
    return res.status(500).json({ message: "Get Message Details error" });
  }
};

// ✅ Get conversation messages
export const getMessages = async (req, res) => {
  try {
    const sender = req.userId;
    const receiver = req.params.receiver;

    const conversation = await Conversation.findOne({
      participants: { $all: [sender, receiver] },
    })
      .populate({
        path: "messages",
        populate: [
          { path: "sender", select: "name image" }, // sender details
          {
            path: "replyTo",
            populate: { path: "sender", select: "name image" }, // ✅ nested sender in replyTo
          },
        ],
      });

    if (!conversation) return res.status(200).json([]);

    return res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    return res.status(500).json({ message: "Get Messages error" });
  }
};

// ✅ Mark as seen
export const markMessagesAsSeen = async (req, res) => {
  try {
    const sender = req.params.sender;
    const receiver = req.userId;

    await markMessagesSeenHelper(sender, receiver);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking messages seen:", error);
    res.status(500).json({ message: "Mark seen error" });
  }
};

// ✅ React to a message
export const reactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Remove old reaction
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== userId.toString()
    );

    // Add new reaction if emoji is provided
    if (emoji && emoji.trim() !== "") {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    // Emit to both sender & receiver
    const receiverSocketId = getReceiverSocketId(message.receiver);
    const senderSocketId = getReceiverSocketId(message.sender);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReacted", {
        messageId,
        reactions: message.reactions,
      });
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageReacted", {
        messageId,
        reactions: message.reactions,
      });
    }

    return res.status(200).json(message);
  } catch (err) {
    console.error("React message error:", err);
    res.status(500).json({ message: "React error" });
  }
};

// ✅ Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.body;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (forEveryone) {
      if (message.sender.toString() !== userId.toString()) {
        return res
          .status(403)
          .json({ message: "Not allowed to delete for everyone" });
      }
      message.isDeleted = true;
      message.message = "";
      message.image = "";
    } else {
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();

    const receiverSocketId = getReceiverSocketId(message.receiver);
    const senderSocketId = getReceiverSocketId(message.sender);

    const payload = { messageId: message._id, forEveryone, userId };

    if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", payload);
    if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", payload);

    res.status(200).json({ success: true, message });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Delete error" });
  }
};

// ✅ Forward a message
export const forwardMessage = async (req, res) => {
  try {
    const sender = req.userId;
    const receiver = req.params.receiver;
    const { messageId } = req.body;

    const original = await Message.findById(messageId);
    if (!original) return res.status(404).json({ message: "Message not found" });

    const receiverSocketId = getReceiverSocketId(receiver);
    const status = receiverSocketId ? "delivered" : "sent";

    const newMessage = await Message.create({
      sender,
      receiver,
      message: original.message || "",
      image: original.image || "",
      status,
      isForwarded: true,
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [sender, receiver] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [sender, receiver],
        messages: [newMessage._id],
      });
    } else {
      conversation.messages.push(newMessage._id);
      await conversation.save();
    }

    const senderUser = await User.findById(sender).select("name image");
    const receiverUser = await User.findById(receiver).select("name image");

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        sender,
        senderName: senderUser?.name,
        senderImage: senderUser?.image,
        receiver,
        receiverName: receiverUser?.name,
        receiverImage: receiverUser?.image,
        message: newMessage.message,
        image: newMessage.image,
        createdAt: newMessage.createdAt,
        _id: newMessage._id,
        status: newMessage.status,
        isForwarded: true,
        reactions: [],
      });

      const senderSocketId = getReceiverSocketId(sender);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDelivered", {
          messageId: newMessage._id,
        });
      }
    }

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error("Forward message error:", err);
    res.status(500).json({ message: "Forward Message error" });
  }
};
