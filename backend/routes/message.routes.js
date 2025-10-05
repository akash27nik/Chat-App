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
  getMessageDetails,   // ✅ new controller
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

// Delete a message
messageRouter.put("/delete/:messageId", isAuth, deleteMessage);

// ✅ Get message details (for "Message Info" like WhatsApp)
messageRouter.get("/details/:messageId", isAuth, getMessageDetails);

export default messageRouter;
