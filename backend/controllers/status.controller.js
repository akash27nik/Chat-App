import Status from "../models/status.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import { io } from "../socket/socket.js";
import mongoose from "mongoose";

// ─── ADD STATUS ───
export const addStatus = async (req, res) => {
  try {
    const { 
        type = "media", // Default to media if not sent
        caption, 
        text, 
        color, 
        font, 
        musicStartTime, 
        musicDuration, 
        isMuted 
    } = req.body;
    
    const userId = req.userId;

    // ✅ CASE 1: Text Status (No File Upload)
    if (type === "text") {
        if (!text) {
            return res.status(400).json({ message: "Text content is required" });
        }
        
        const newStatus = await Status.create({
            user: userId,
            type: "text",
            text,
            font: font || "font-sans",
            color: color || "#000000",
            // Music can still apply to text status if sent
            musicUrl: req.body.musicUrl || "", 
            musicStartTime: Number(musicStartTime) || 0,
            musicDuration: Number(musicDuration) || 15,
            createdAt: new Date(),
            viewers: []
        });

        const populatedStatus = await Status.findById(newStatus._id).populate("user", "name image");
        
        io.emit("newStatus", populatedStatus);
        
        return res.status(201).json({
            message: "Text status uploaded successfully",
            status: populatedStatus
        });
    }

    // ✅ CASE 2: Media Status (Requires File)
    const mediaFile = req.files?.media ? req.files.media[0] : null;
    const musicFile = req.files?.music ? req.files.music[0] : null;

    if (!mediaFile) {
      return res.status(400).json({ message: "No media file uploaded" });
    }

    // 1. Upload Main Media
    const mediaUploadResult = await uploadOnCloudinary(mediaFile.path);
    if (!mediaUploadResult?.secure_url) {
      return res.status(500).json({ message: "Failed to upload media to Cloudinary" });
    }

    // 2. Handle Music Upload (if file provided)
    let musicUrl = req.body.musicUrl || "";
    if (musicFile) {
      const musicUploadResult = await uploadOnCloudinary(musicFile.path);
      if (musicUploadResult?.secure_url) {
        musicUrl = musicUploadResult.secure_url;
      }
    }

    // 3. Create Media Status
    const status = await Status.create({
      user: userId,
      type: "media",
      mediaUrl: mediaUploadResult.secure_url,
      caption: caption || "",
      musicUrl,
      musicStartTime: Number(musicStartTime) || 0,
      musicDuration: Number(musicDuration) || 15,
      isMuted: isMuted === "true" || isMuted === true,
      createdAt: new Date(),
      viewers: [],
    });

    const populatedStatus = await Status.findById(status._id).populate("user", "name image");

    io.emit("newStatus", populatedStatus);

    return res.status(201).json({
      message: "Status uploaded successfully",
      status: populatedStatus,
      mediaType: mediaUploadResult.resource_type === "video" ? "video" : "image",
    });

  } catch (error) {
    console.error("addStatus error:", error);
    return res.status(500).json({ message: `addStatus error: ${error.message}` });
  }
};

// ... (Rest of the controller functions remain unchanged below)
export const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find().populate("user", "name image");
    return res.status(200).json(statuses);
  } catch (error) {
    console.error("getStatuses error:", error);
    return res.status(500).json({ message: `getStatuses error: ${error.message}` });
  }
};

export const getStatus = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(statusId)) return res.status(400).json({ message: "Invalid status ID" });
    const status = await Status.findById(statusId).populate("user", "name image");
    if (!status) return res.status(404).json({ message: "Status not found" });
    return res.status(200).json(status);
  } catch (error) {
    console.error("getStatus error:", error);
    return res.status(500).json({ message: `getStatus error: ${error.message}` });
  }
};

export const deleteStatus = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    if (status.user.toString() !== req.userId) return res.status(403).json({ message: "Unauthorized" });
    await Status.findByIdAndDelete(statusId);
    return res.status(200).json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("deleteStatus error:", error);
    return res.status(500).json({ message: `deleteStatus error: ${error.message}` });
  }
};

export const likeStatus = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    const alreadyLiked = status.likes.some((like) => like.user.toString() === userId);
    if (alreadyLiked) return res.status(400).json({ message: "Already liked" });
    status.likes.push({ user: userId, likedAt: new Date() });
    await status.save();
    await status.populate("likes.user", "name image");
    io.to(status.user.toString()).emit("statusLiked", { statusId, likes: status.likes });
    return res.status(200).json({ message: "Status liked", likes: status.likes });
  } catch (err) {
    console.error("likeStatus error:", err);
    return res.status(500).json({ message: `likeStatus error: ${err.message}` });
  }
};

export const unlikeStatus = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    status.likes = status.likes.filter((like) => like.user.toString() !== userId);
    await status.save();
    await status.populate("likes.user", "name image");
    io.to(status.user.toString()).emit("statusUnliked", { statusId, likes: status.likes });
    return res.status(200).json({ message: "Status unliked", likes: status.likes });
  } catch (err) {
    console.error("unlikeStatus error:", err);
    return res.status(500).json({ message: `unlikeStatus error: ${err.message}` });
  }
};

export const replyStatus = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const { message } = req.body;
    const userId = req.userId;
    if (!message) return res.status(400).json({ message: "Reply message is required" });
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    const reply = { user: userId, message, createdAt: new Date() };
    status.replies.push(reply);
    await status.save();
    await status.populate("replies.user", "name image");
    io.to(status.user.toString()).emit("statusReplied", { statusId, replies: status.replies });
    return res.status(200).json({ message: "Replied successfully", replies: status.replies });
  } catch (err) {
    console.error("replyStatus error:", err);
    return res.status(500).json({ message: `replyStatus error: ${err.message}` });
  }
};

export const markStatusViewed = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;
    if (!mongoose.Types.ObjectId.isValid(statusId)) return res.status(400).json({ message: "Invalid statusId" });
    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });
    const alreadyViewed = status.viewers.some((v) => v.user.toString() === userId.toString());
    if (!alreadyViewed) {
      status.viewers.push({ user: userId, viewedAt: new Date() });
      await status.save();
    }
    await status.populate("viewers.user", "name image");
    const formattedViewers = status.viewers.filter((v) => v.user).map((v) => ({ _id: v.user._id, name: v.user.name, image: v.user.image, viewedAt: v.viewedAt }));
    io.to(status.user.toString()).emit("statusViewed", { statusId, viewers: formattedViewers });
    return res.status(200).json({ message: "Marked as viewed", status: { ...status.toObject(), viewers: formattedViewers } });
  } catch (err) {
    console.error("markStatusViewed error:", err);
    return res.status(500).json({ message: `markStatusViewed error: ${err.message}` });
  }
};

export const getStatusViewers = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;
    if (!mongoose.Types.ObjectId.isValid(statusId)) return res.status(400).json({ message: "Invalid statusId" });
    const status = await Status.findById(statusId).populate("viewers.user", "name image");
    if (!status) return res.status(404).json({ message: "Status not found" });
    if (status.user.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });
    const viewersList = status.viewers.filter((v) => v.user).map((v) => ({ _id: v.user._id, name: v.user.name, image: v.user.image, viewedAt: v.viewedAt }));
    return res.status(200).json(viewersList);
  } catch (err) {
    console.error("getStatusViewers error:", err);
    return res.status(500).json({ message: `getStatusViewers error: ${err.message}` });
  }
};