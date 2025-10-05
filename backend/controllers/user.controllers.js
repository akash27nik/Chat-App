import uploadCloudinary from '../config/cloudinary.js';
import User from '../models/user.model.js';
import Message from "../models/message.model.js";

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
    console.log(error);
    
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
  }a
}

export const getOtherUsersWithLastMessage = async (req, res) => {
  try {
    const myId = req.userId; // ✅ change here
    const users = await User.find({ _id: { $ne: myId } }).lean();

    const result = [];
    for (let user of users) {
      try {
        const lastMsg = await Message.findOne({
          $or: [
            { sender: myId, receiver: user._id },
            { sender: user._id, receiver: myId }
          ]
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          sender: user._id,
          receiver: myId,
          status: { $ne: "seen" }
        });

        result.push({
          ...user,
          lastMessage: lastMsg ? { createdAt: lastMsg.createdAt } : null,
          unreadCount
        });
      } catch (innerErr) {
        console.error(`Error processing user ${user._id}:`, innerErr);
      }
    }

    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ users: result });
  } catch (err) {
    console.error("Error in getOtherUsersWithLastMessage:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};