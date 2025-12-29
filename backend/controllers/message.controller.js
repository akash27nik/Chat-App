import uploadOnCloudinary from "../config/cloudinary.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { markMessagesSeenHelper } from "../services/message.service.js";
import User from "../models/user.model.js";

// ✅ HELPER: Create and Emit System Message
const createAndEmitSystemMessage = async (groupId, text, senderId) => {
    try {
        // Create the system message in DB
        const systemMsg = await Message.create({
            sender: senderId, // The person performing the action
            receiver: groupId,
            message: text,
            isSystem: true, // ✅ Flag as system message
            status: 'sent',
        });

        // Add to conversation history
        const conversation = await Conversation.findById(groupId);
        if (conversation) {
            conversation.messages.push(systemMsg._id);
            await conversation.save();

            // Emit to all participants via Socket
            if (io) {
                const payload = {
                    ...systemMsg.toObject(),
                    senderName: "System",
                    isGroup: true,
                    groupId: groupId
                };
                
                conversation.participants.forEach(participantId => {
                    const socketId = getReceiverSocketId(participantId);
                    if (socketId) {
                        io.to(socketId).emit("newMessage", payload);
                    }
                });
            }
        }
    } catch (error) {
        console.error("System message error:", error);
    }
};

export const sendMessage = async (req, res) => {
  try {
    const sender = req.userId;
    const receiver = req.params.receiver; 
    // ✅ Extract 'expiresIn' from request body
    const { 
        message, 
        mediaUrl, 
        isForwarded, 
        replyTo, 
        statusReplyToId, 
        statusReplyToMediaUrl, 
        statusReplyToCaption, 
        statusReplyToUserName,
        expiresIn // <--- Get the duration (in seconds) from frontend
    } = req.body;

    const senderData = await User.findById(sender);
    const groupConversation = await Conversation.findById(receiver);
    const isGroup = groupConversation?.isGroup === true;

    let receiverData = null;
    let isBlockedByReceiver = false;

    if (!isGroup) {
        receiverData = await User.findById(receiver);
        if (senderData.blockedUsers && senderData.blockedUsers.includes(receiver)) {
            return res.status(403).json({ message: "You have blocked this user." });
        }
        isBlockedByReceiver = receiverData.blockedUsers && receiverData.blockedUsers.includes(sender);
    }

    let image;
    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      image = uploadResult.secure_url;
    }
    if (mediaUrl) image = mediaUrl;

    let status = "sent";
    if (!isGroup) {
         const receiverSocketId = getReceiverSocketId(receiver);
         status = (receiverSocketId && !isBlockedByReceiver) ? "delivered" : "sent";
    }

    // ✅ CALCULATE EXPIRATION DATE
    // If expiresIn > 0 (e.g. 86400 for 24h), set the date.
    // Otherwise, set it to null so it NEVER expires.
    let expiresAt = null;
    if (expiresIn && parseInt(expiresIn) > 0) {
        expiresAt = new Date(Date.now() + parseInt(expiresIn) * 1000);
    }

    const newMessage = await Message.create({
      sender, receiver, message, image, status,
      isForwarded: isForwarded || false,
      replyTo: replyTo || null,
      statusReplyToId: statusReplyToId || null,
      statusReplyToMediaUrl: statusReplyToMediaUrl || "",
      statusReplyToCaption: statusReplyToCaption || "",
      statusReplyToUserName: statusReplyToUserName || "",
      blockedByReceiver: isBlockedByReceiver,
      // ✅ SAVE EXPIRATION
      expiresAt: expiresAt,
      details: { sentAt: new Date(), device: req.headers["user-agent"] || "Unknown Device" },
    });

    let conversation;
    if (isGroup) {
        conversation = groupConversation;
        conversation.messages.push(newMessage._id);
        await conversation.save();
    } else {
        conversation = await Conversation.findOne({
            participants: { $all: [sender, receiver] },
            $or: [{ isGroup: false }, { isGroup: { $exists: false } }]
        });
        if (!conversation) {
            conversation = await Conversation.create({ participants: [sender, receiver], messages: [newMessage._id], isGroup: false });
        } else {
            conversation.messages.push(newMessage._id);
            await conversation.save();
        }
    }

    const payload = {
      ...newMessage.toObject(),
      senderName: senderData?.name, senderImage: senderData?.image,
      receiverName: isGroup ? groupConversation.groupName : receiverData?.name,
      receiverImage: isGroup ? groupConversation.groupImage : receiverData?.image,
      isGroup: isGroup, groupId: isGroup ? receiver : null,
      statusReplyToMediaUrl: newMessage.statusReplyToMediaUrl,
      statusReplyToCaption: newMessage.statusReplyToCaption,
      statusReplyToUserName: newMessage.statusReplyToUserName,
      statusReplyToId: newMessage.statusReplyToId,
      // ✅ Send expiresAt to frontend so UI can show the timer
      expiresAt: newMessage.expiresAt 
    };

    if (io) {
      if (isGroup) {
          conversation.participants.forEach(participantId => {
              if (participantId.toString() !== sender.toString()) {
                  const socketId = getReceiverSocketId(participantId);
                  if (socketId) io.to(socketId).emit("newMessage", payload);
              }
          });
          const senderSocket = getReceiverSocketId(sender);
          if (senderSocket) io.to(senderSocket).emit("newMessage", payload);
      } else {
          const receiverSocketId = getReceiverSocketId(receiver);
          if (receiverSocketId && !isBlockedByReceiver) {
            io.to(receiverSocketId).emit("newMessage", payload);
            io.to(getReceiverSocketId(sender)).emit("messageDelivered", { messageId: newMessage._id });
          } else {
            io.to(getReceiverSocketId(sender)).emit("newMessage", payload);
          }
      }
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
        const message = await Message.findById(messageId).populate("sender", "name image").populate("receiver", "name image").populate({ path: "replyTo", populate: { path: "sender", select: "name image" }}).populate({ path: "statusReplyToId", populate: { path: "user", select: "name image" }});
        if (!message) return res.status(404).json({ message: "Message not found" });
        return res.status(200).json({ ...message.toObject() });
    } catch (error) { return res.status(500).json({ message: "Get Message Details error" }); }
};

export const getMessages = async (req, res) => {
    try {
        const sender = req.userId; const receiver = req.params.receiver; 
        let conversation = await Conversation.findById(receiver).populate({ path: "messages", populate: [ { path: "sender", select: "name image" }, { path: "replyTo", populate: { path: "sender", select: "name image" } }, { path: "statusReplyToId", populate: { path: "user", select: "name image" } }, ], });
        if (!conversation) { conversation = await Conversation.findOne({ participants: { $all: [sender, receiver] }, $or: [{ isGroup: false }, { isGroup: { $exists: false } }] }).populate({ path: "messages", populate: [ { path: "sender", select: "name image" }, { path: "replyTo", populate: { path: "sender", select: "name image" } }, { path: "statusReplyToId", populate: { path: "user", select: "name image" } }, ], }); }
        if (!conversation) return res.status(200).json([]);
        const visibleMessages = conversation.messages.filter((msg) => {
          if (msg.deletedFor && msg.deletedFor.includes(sender)) return false;
          if (!conversation.isGroup && msg.blockedByReceiver && msg.receiver.toString() === sender.toString()) return false;
          return true;
        });
        return res.status(200).json(visibleMessages);
    } catch (error) { return res.status(500).json({ message: "Get Messages error" }); }
};

export const markMessagesAsSeen = async (req, res) => { try { const sender = req.params.sender; const receiver = req.userId; await markMessagesSeenHelper(sender, receiver); res.status(200).json({ success: true }); } catch (error) { res.status(500).json({ message: "Mark seen error" }); } };
export const reactMessage = async (req, res) => { try { const { messageId } = req.params; const { emoji } = req.body; const userId = req.userId; const message = await Message.findById(messageId); if (!message) return res.status(404).json({ message: "Message not found" }); if (Array.isArray(message.reactions)) { message.reactions = message.reactions.filter((r) => r.user && r.user.toString() !== userId.toString()); } else { message.reactions = []; } if (emoji !== "") message.reactions.push({ user: userId, emoji }); await message.save(); const receiverSocketId = getReceiverSocketId(message.receiver); const senderSocketId = getReceiverSocketId(message.sender); if (io) { if (receiverSocketId) io.to(receiverSocketId).emit("messageReacted", { messageId, reactions: message.reactions }); if (senderSocketId) io.to(senderSocketId).emit("messageReacted", { messageId, reactions: message.reactions }); } return res.status(200).json(message); } catch (err) { res.status(500).json({ message: `React error: ${err.message}` }); } };
export const deleteMessage = async (req, res) => { try { const { messageId } = req.params; const { forEveryone } = req.body; const userId = req.userId; const message = await Message.findById(messageId); if (!message) return res.status(404).json({ message: "Message not found" }); if (forEveryone) { if (message.sender.toString() !== userId.toString()) { return res.status(403).json({ message: "Not allowed to delete for everyone" }); } message.isDeleted = true; message.message = ""; message.image = ""; } else { if (!message.deletedFor.includes(userId)) { message.deletedFor.push(userId); } } await message.save(); const receiverSocketId = getReceiverSocketId(message.receiver); const senderSocketId = getReceiverSocketId(message.sender); const payload = { messageId: message._id, forEveryone, userId }; if (io) { if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", payload); if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", payload); } res.status(200).json({ success: true, message }); } catch (err) { res.status(500).json({ message: "Delete error" }); } };
export const deleteConversation = async (req, res) => { try { const userId = req.userId; const otherUserId = req.params.userId; let conversation = await Conversation.findById(otherUserId); if (!conversation) { conversation = await Conversation.findOne({ participants: { $all: [userId, otherUserId] } }); } if (conversation) { const messages = await Message.find({ _id: { $in: conversation.messages } }); const messageIds = messages.map((msg) => msg._id); await Message.updateMany({ _id: { $in: messageIds } }, { $addToSet: { deletedFor: userId } }); } else { await Message.updateMany( { $or: [{ sender: userId, receiver: otherUserId }, { sender: otherUserId, receiver: userId }] }, { $addToSet: { deletedFor: userId } } ); } res.status(200).json({ message: "Conversation cleared successfully" }); } catch (error) { res.status(500).json({ message: "Delete conversation error" }); } };
export const forwardMessage = async (req, res) => { try { const sender = req.userId; const receiver = req.params.receiver; const { messageId } = req.body; const original = await Message.findById(messageId); if (!original) return res.status(404).json({ message: "Message not found" }); const receiverSocketId = getReceiverSocketId(receiver); const status = receiverSocketId ? "delivered" : "sent"; const newMessage = await Message.create({ sender, receiver, message: original.message || "", image: original.image || "", status, isForwarded: true, }); let conversation = await Conversation.findOne({ participants: { $all: [sender, receiver] }, $or: [{ isGroup: false }, { isGroup: { $exists: false } }] }); if (!conversation) { conversation = await Conversation.create({ participants: [sender, receiver], messages: [newMessage._id], isGroup: false }); } else { conversation.messages.push(newMessage._id); await conversation.save(); } const senderUser = await User.findById(sender).select("name image"); const receiverUser = await User.findById(receiver).select("name image"); if (io && receiverSocketId) { io.to(receiverSocketId).emit("newMessage", { ...newMessage.toObject(), senderName: senderUser?.name, senderImage: senderUser?.image, receiverName: receiverUser?.name, receiverImage: receiverUser?.image, }); const senderSocketId = getReceiverSocketId(sender); if (senderSocketId) io.to(senderSocketId).emit("messageDelivered", { messageId: newMessage._id }); } return res.status(201).json(newMessage); } catch (err) { res.status(500).json({ message: "Forward Message error" }); } };
export const togglePinMessage = async (req, res) => { try { const { messageId } = req.params; const message = await Message.findById(messageId); if (!message) return res.status(404).json({ message: "Message not found" }); message.isPinned = !message.isPinned; await message.save(); res.status(200).json(message); } catch (error) { res.status(500).json({ error: "Internal server error" }); } };
export const createGroup = async (req, res) => { try { const { name, members } = req.body; const currentUserId = req.userId; if (!name || !members || members.length < 2) { return res.status(400).json({ error: "Group must have a name and at least 2 members" }); } const allMembers = [...new Set([...members, currentUserId])]; const newConversation = await Conversation.create({ isGroup: true, groupName: name, groupAdmins: [currentUserId], participants: allMembers, messages: [] }); const populatedConversation = await Conversation.findById(newConversation._id).populate("participants", "name userName image").populate("groupAdmins", "name image"); const result = { _id: populatedConversation._id, name: populatedConversation.groupName, groupName: populatedConversation.groupName, image: populatedConversation.groupImage || "", isGroup: true, members: populatedConversation.participants, admins: populatedConversation.groupAdmins.map(a => a._id.toString()), participants: populatedConversation.participants, }; res.status(201).json(result); } catch (error) { res.status(500).json({ error: "Internal Server Error" }); } };

// ✅ UPDATED: ADD MEMBER TO GROUP
export const addMemberToGroup = async (req, res) => {
    try {
        const { id } = req.params; // Group ID
        const { userId } = req.body;
        const group = await Conversation.findById(id);

        if (!group) return res.status(404).json({ message: "Group not found" });

        if (!group.participants.includes(userId)) {
            group.participants.push(userId);
            await group.save();

            // ✅ TRIGGER SYSTEM MESSAGE
            const actor = await User.findById(req.userId).select("name");
            const target = await User.findById(userId).select("name");
            if (actor && target) {
                await createAndEmitSystemMessage(id, `${actor.name} added ${target.name}`, req.userId);
            }
        }

        const populatedGroup = await Conversation.findById(id)
            .populate("participants", "name image email about")
            .populate("groupAdmins", "name image");
            
        const result = {
             _id: populatedGroup._id, 
             name: populatedGroup.groupName,
             groupName: populatedGroup.groupName,
             image: populatedGroup.groupImage || "", 
             isGroup: true,
             members: populatedGroup.participants, 
             admins: populatedGroup.groupAdmins.map(a => a._id.toString()),
             participants: populatedGroup.participants,
        };
        
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to add member" });
    }
};

// ✅ UPDATED: REMOVE MEMBER FROM GROUP
export const removeMemberFromGroup = async (req, res) => {
    try {
        const { id } = req.params; // Group ID
        const { userId } = req.body;
        
        await Conversation.findByIdAndUpdate(id, {
            $pull: { participants: userId, groupAdmins: userId }
        });

        // ✅ TRIGGER SYSTEM MESSAGE
        const actor = await User.findById(req.userId).select("name");
        const target = await User.findById(userId).select("name");
        if (actor && target) {
            await createAndEmitSystemMessage(id, `${actor.name} removed ${target.name}`, req.userId);
        }

        const populatedGroup = await Conversation.findById(id)
            .populate("participants", "name image email about")
            .populate("groupAdmins", "name image");

        const result = {
             _id: populatedGroup._id, 
             name: populatedGroup.groupName,
             groupName: populatedGroup.groupName,
             image: populatedGroup.groupImage || "", 
             isGroup: true,
             members: populatedGroup.participants, 
             admins: populatedGroup.groupAdmins.map(a => a._id.toString()),
             participants: populatedGroup.participants,
        };

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to remove member" });
    }
};

// ✅ UPDATED: EXIT GROUP
export const exitGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        await Conversation.findByIdAndUpdate(id, {
            $pull: { participants: userId, groupAdmins: userId }
        });

        // ✅ TRIGGER SYSTEM MESSAGE
        const actor = await User.findById(userId).select("name");
        if (actor) {
            await createAndEmitSystemMessage(id, `${actor.name} left the group`, userId);
        }

        res.status(200).json({ message: "Exited group successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to exit group" });
    }
};

// ... [Keep updateGroupImage, renameGroup AS IS] ...
export const updateGroupImage = async (req, res) => { try { const { id } = req.params; let image = ""; if (req.file) { const uploadResult = await uploadOnCloudinary(req.file.path); image = uploadResult.secure_url; } const group = await Conversation.findByIdAndUpdate(id, { groupImage: image }, { new: true }).populate("participants", "name image email about").populate("groupAdmins", "name image"); const result = { _id: group._id, name: group.groupName, groupName: group.groupName, image: group.groupImage || "", isGroup: true, members: group.participants, admins: group.groupAdmins.map(a => a._id.toString()), participants: group.participants, }; res.status(200).json(result); } catch (error) { console.error(error); res.status(500).json({ message: "Failed to update group image" }); } };
export const renameGroup = async (req, res) => { try { const { id } = req.params; const { name } = req.body; const group = await Conversation.findByIdAndUpdate(id, { groupName: name }, { new: true }).populate("participants", "name image email about").populate("groupAdmins", "name image"); const result = { _id: group._id, name: group.groupName, groupName: group.groupName, image: group.groupImage || "", isGroup: true, members: group.participants, admins: group.groupAdmins.map(a => a._id.toString()), participants: group.participants, }; res.status(200).json(result); } catch (error) { console.error(error); res.status(500).json({ message: "Failed to rename group" }); } };