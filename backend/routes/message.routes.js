import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import {
  getMessages,
  sendMessage,
  markMessagesAsSeen,
  reactMessage,
  deleteMessage,
  forwardMessage,
  getMessageDetails,
  deleteConversation,
  togglePinMessage, 
  createGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  exitGroup,
  updateGroupImage,
  renameGroup
} from "../controllers/message.controller.js";

const messageRouter = express.Router();

// Send new message (text / image)
messageRouter.post("/send/:receiver", isAuth, upload.single("image"), sendMessage);

// Forward a message
messageRouter.post("/forward/:receiver", isAuth, forwardMessage);

// Get messages
messageRouter.get("/get/:receiver", isAuth, getMessages);

// Mark as seen
messageRouter.put("/seen/:sender", isAuth, markMessagesAsSeen);

// React to a message
messageRouter.put("/react/:messageId", isAuth, reactMessage);

// Delete a single message (Delete for me / Delete for everyone)
messageRouter.put("/delete/:messageId", isAuth, deleteMessage);

// Delete Entire Conversation
messageRouter.delete("/conversation/:userId", isAuth, deleteConversation);

// Get message details
messageRouter.get("/details/:messageId", isAuth, getMessageDetails);

// Pin or Unpin a message
messageRouter.put("/pin/:messageId", isAuth, togglePinMessage);

// ✅ GROUP ROUTES (Fixed)
messageRouter.post("/group/create", isAuth, createGroup);
messageRouter.put("/group/add/:id", isAuth, addMemberToGroup);
messageRouter.put("/group/remove/:id", isAuth, removeMemberFromGroup);
messageRouter.put("/group/exit/:id", isAuth, exitGroup);

// 🔴 FIX: Changed from "/group/update-image/:id" to match frontend's "/group/image/:id"
messageRouter.put("/group/image/:id", isAuth, upload.single("image"), updateGroupImage);

messageRouter.put("/group/rename/:id", isAuth, renameGroup);

export default messageRouter;