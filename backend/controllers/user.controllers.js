import uploadCloudinary from '../config/cloudinary.js';
import User from '../models/user.model.js';
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js"; 

export const getCurrentUser = async (req, res) => {
  try {
    let userId = req.userId;
    let user = await User.findById(userId).select("-password")
    if (!user){
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  }catch (error){
    return res.status(500).json({ message: `Current User error: ${error}` });
  }
}

export const editProfile = async (req, res) => {
  try {
    let {name} = req.body;
    let image;
     if (req.file) {
      image = await uploadCloudinary(req.file.path);
     }

     let user = await User.findByIdAndUpdate(req.userId, {
      name,
      image
     },{new: true})

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user = await User.findById(req.userId).select("-password");
      return res.status(200).json({ user, message: "Profile updated successfully" });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: `Profile update error: ${error}` });
  }
}

export const getAllUsers = async (req, res)=>{
  try {
    let users = await User.find({
      _id: { $ne: req.userId}
    }).select("-password")
    return res.status(200).json(users)
    
  } catch (error) {
    return res.status(500).json({ message: `Get all users error: ${error}` });
  }
}

// ✅ UPDATED: Fetch Users AND Groups with Full Details
export const getOtherUsersWithLastMessage = async (req, res) => {
  try {
    const myId = req.userId; 
    
    const currentUser = await User.findById(myId).select("blockedUsers archivedUsers favoriteUsers markedUnreadUsers");
    
    // 1. Fetch Individual Users
    const users = await User.find({ _id: { $ne: myId } }).lean();
    const result = [];

    // Process Users (1:1 Chats)
    for (let user of users) {
      try {
        const lastMsg = await Message.findOne({
          $or: [
            { sender: myId, receiver: user._id },
            { sender: user._id, receiver: myId, blockedByReceiver: false } 
          ],
          deletedFor: { $ne: myId }
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          sender: user._id,
          receiver: myId,
          status: { $ne: "seen" },
          deletedFor: { $ne: myId },
          blockedByReceiver: false 
        });

        const isBlocked = currentUser.blockedUsers?.some(id => id.toString() === user._id.toString()) || false;
        const isArchived = currentUser.archivedUsers?.some(id => id.toString() === user._id.toString()) || false;
        const isFavorite = currentUser.favoriteUsers?.some(id => id.toString() === user._id.toString()) || false;
        const isMarkedUnread = currentUser.markedUnreadUsers?.some(id => id.toString() === user._id.toString()) || false;
        const isBlockedByThem = user.blockedUsers?.some(id => id.toString() === myId.toString()) || false;

        if (isBlockedByThem) { user.image = ""; user.lastSeen = null; }
        if (isBlocked) { user.lastSeen = null; }

        result.push({
          ...user,
          lastMessage: lastMsg ? { ...lastMsg, createdAt: lastMsg.createdAt } : null,
          unreadCount: isMarkedUnread && unreadCount === 0 ? 1 : unreadCount, 
          isBlocked,
          isBlockedByThem,
          isArchived,
          isFavorite,
          isMarkedUnread,
          isGroup: false 
        });
      } catch (innerErr) {
        console.error(`Error processing user ${user._id}:`, innerErr);
      }
    }

    // 2. Fetch Groups (Where I am a participant)
    const groups = await Conversation.find({
        isGroup: true,
        participants: { $in: [myId] }
    })
    .populate({
        path: "participants",
        select: "name image about email" // ✅ Get Full Member Details
    })
    .populate({
        path: "groupAdmins",
        select: "name image"
    })
    .populate({
        path: "messages",
        options: { sort: { createdAt: -1 }, limit: 1 }, 
        populate: { path: "sender", select: "name" } 
    })
    .lean();

    // Process Groups
    for (let group of groups) {
         const lastMsg = group.messages[0];
         
         // Format the group object to match what frontend expects
         result.push({
             _id: group._id, 
             name: group.groupName,
             groupName: group.groupName,
             image: group.groupImage || "", 
             isGroup: true,
             // ✅ Map fields for frontend
             members: group.participants, 
             admins: group.groupAdmins ? group.groupAdmins.map(a => a._id.toString()) : [],
             participants: group.participants,
             
             lastMessage: lastMsg ? {
                 message: lastMsg.message,
                 createdAt: lastMsg.createdAt,
                 image: lastMsg.image,
                 video: lastMsg.video,
                 audio: lastMsg.audio,
                 sender: lastMsg.sender 
             } : null,
             unreadCount: 0, // Placeholder
             updatedAt: group.updatedAt
         });
    }

    // 3. Sort Combined List
    result.sort((a, b) => {
      const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    res.json({ users: result });
  } catch (err) {
    console.error("Error in getOtherUsersWithLastMessage:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    const currentUserId = req.userId;
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { blockedUsers: userIdToBlock } });
    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error blocking user" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userIdToUnblock } = req.body;
    const currentUserId = req.userId;
    await User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: userIdToUnblock } });
    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error unblocking user" });
  }
};

export const toggleArchiveUser = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.userId;
    const user = await User.findById(currentUserId);
    if (user.archivedUsers.includes(targetUserId)) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { archivedUsers: targetUserId } });
      res.status(200).json({ message: "Chat unarchived", isArchived: false });
    } else {
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { archivedUsers: targetUserId } });
      res.status(200).json({ message: "Chat archived", isArchived: true });
    }
  } catch (error) {
    res.status(500).json({ message: "Error toggling archive" });
  }
};

export const toggleFavoriteUser = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.userId;
    const user = await User.findById(currentUserId);
    if (user.favoriteUsers.includes(targetUserId)) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { favoriteUsers: targetUserId } });
      res.status(200).json({ message: "Removed from favorites", isFavorite: false });
    } else {
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { favoriteUsers: targetUserId } });
      res.status(200).json({ message: "Added to favorites", isFavorite: true });
    }
  } catch (error) {
    res.status(500).json({ message: "Error toggling favorite" });
  }
};

export const toggleMarkUnreadUser = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.userId;
    const user = await User.findById(currentUserId);
    if (user.markedUnreadUsers.includes(targetUserId)) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { markedUnreadUsers: targetUserId } });
      res.status(200).json({ message: "Marked as read", isMarkedUnread: false });
    } else {
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { markedUnreadUsers: targetUserId } });
      res.status(200).json({ message: "Marked as unread", isMarkedUnread: true });
    }
  } catch (error) {
    res.status(500).json({ message: "Error toggling unread status" });
  }
};