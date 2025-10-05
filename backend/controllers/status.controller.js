import Status from "../models/status.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import { io } from "../socket/socket.js";
import mongoose from "mongoose";

// ─── ADD STATUS ───
export const addStatus = async (req, res) => {
  try {
    const { caption } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ message: "No media file uploaded" });
    }

    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (!uploadResult?.secure_url) {
      return res.status(500).json({ message: "Failed to upload media to Cloudinary" });
    }

    const status = await Status.create({
      user: userId,
      caption,
      mediaUrl: uploadResult.secure_url,
      createdAt: new Date(),
      viewers: [],
    });

    const populatedStatus = await Status.findById(status._id).populate("user", "name image");

    // ✅ Broadcast new status to all clients
    io.emit("newStatus", populatedStatus);

    return res.status(201).json({
      message: "Status uploaded successfully",
      status: populatedStatus,
      mediaType: uploadResult.resource_type === "video" ? "video" : "image",
    });
  } catch (error) {
    console.error("addStatus error:", error);
    return res.status(500).json({ message: `addStatus error: ${error.message}` });
  }
};

// ─── GET STATUSES ───
export const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find().populate("user", "name image");
    return res.status(200).json(statuses);
  } catch (error) {
    console.error("getStatuses error:", error);
    return res.status(500).json({ message: `getStatuses error: ${error.message}` });
  }
};

// ─── DELETE STATUS ───
export const deleteStatus = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await Status.findById(statusId);

    if (!status) return res.status(404).json({ message: "Status not found" });
    if (status.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized to delete this status" });
    }

    await Status.findByIdAndDelete(statusId);

    // ❌ Removed io.emit("statusDeleted") here
    // Now handled fully by socket.js via socket.on("statusDeleted")

    return res.status(200).json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("deleteStatus error:", error);
    return res.status(500).json({ message: `deleteStatus error: ${error.message}` });
  }
};

// ─── LIKE STATUS ───
export const likeStatus = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;

    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });

    const alreadyLiked = status.likes.some(like => like.user.toString() === userId);
    if (alreadyLiked) return res.status(400).json({ message: "Already liked" });

    status.likes.push({ user: userId, likedAt: new Date() });
    await status.save();
    await status.populate("likes.user", "name image");

    io.to(status.user.toString()).emit("statusLiked", {
      statusId,
      likes: status.likes,
    });

    return res.status(200).json({ message: "Status liked", likes: status.likes });
  } catch (err) {
    console.error("likeStatus error:", err);
    return res.status(500).json({ message: `likeStatus error: ${err.message}` });
  }
};

// ─── UNLIKE STATUS ───
export const unlikeStatus = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;

    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });

    status.likes = status.likes.filter(like => like.user.toString() !== userId);
    await status.save();
    await status.populate("likes.user", "name image");

    io.to(status.user.toString()).emit("statusUnliked", {
      statusId,
      likes: status.likes,
    });

    return res.status(200).json({ message: "Status unliked", likes: status.likes });
  } catch (err) {
    console.error("unlikeStatus error:", err);
    return res.status(500).json({ message: `unlikeStatus error: ${err.message}` });
  }
};

// ─── REPLY STATUS ───
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

    io.to(status.user.toString()).emit("statusReplied", {
      statusId,
      replies: status.replies,
    });

    return res.status(200).json({ message: "Replied successfully", replies: status.replies });
  } catch (err) {
    console.error("replyStatus error:", err);
    return res.status(500).json({ message: `replyStatus error: ${err.message}` });
  }
};


// ─── MARK STATUS VIEWED ───
export const markStatusViewed = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(statusId)) {
      return res.status(400).json({ message: "Invalid statusId" });
    }

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    const alreadyViewed = status.viewers.some(
      (v) => v.user.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      status.viewers.push({ user: userId, viewedAt: new Date() });
      await status.save();
    }

    await status.populate("viewers.user", "name image");

    const formattedViewers = status.viewers
      .filter((v) => v.user)
      .map((v) => ({
        _id: v.user._id,
        name: v.user.name,
        image: v.user.image,
        viewedAt: v.viewedAt,
      }));

    io.to(status.user.toString()).emit("statusViewed", {
      statusId,
      viewers: formattedViewers,
    });

    return res.status(200).json({
      message: "Marked as viewed",
      status: { ...status.toObject(), viewers: formattedViewers },
    });
  } catch (err) {
    console.error("markStatusViewed error:", err);
    return res.status(500).json({ message: `markStatusViewed error: ${err.message}` });
  }
};

// ─── GET STATUS VIEWERS ───
export const getStatusViewers = async (req, res) => {
  try {
    const { id: statusId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(statusId)) {
      return res.status(400).json({ message: "Invalid statusId" });
    }

    const status = await Status.findById(statusId).populate("viewers.user", "name image");

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    if (status.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const viewersList = status.viewers
      .filter((v) => v.user)
      .map((v) => ({
        _id: v.user._id,
        name: v.user.name,
        image: v.user.image,
        viewedAt: v.viewedAt,
      }));

    return res.status(200).json(viewersList);
  } catch (err) {
    console.error("getStatusViewers error:", err);
    return res.status(500).json({ message: `getStatusViewers error: ${err.message}` });
  }
};
