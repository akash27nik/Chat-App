import express from 'express';
import { 
  editProfile, 
  getAllUsers, 
  getCurrentUser, 
  getOtherUsersWithLastMessage,
  blockUser,   
  unblockUser,
  toggleArchiveUser,   // ✅ Added
  toggleFavoriteUser,  // ✅ Added
  toggleMarkUnreadUser // ✅ Added
} from '../controllers/user.controllers.js';
import isAuth from '../middlewares/isAuth.js';
import { upload } from '../middlewares/multer.js';
import User from "../models/user.model.js";

const userRouter = express.Router();  

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.get("/others", isAuth, getAllUsers);
userRouter.put("/profile", isAuth, upload.single("image"), editProfile);
userRouter.get("/others-with-lastmsg", isAuth, getOtherUsersWithLastMessage);

// ✅ Block & Unblock Routes
userRouter.post("/block", isAuth, blockUser);
userRouter.post("/unblock", isAuth, unblockUser);

// ✅ NEW: Toggle Actions (Fixes 404 Errors)
userRouter.post("/toggle-archive", isAuth, toggleArchiveUser);
userRouter.post("/toggle-favorite", isAuth, toggleFavoriteUser);
userRouter.post("/toggle-unread", isAuth, toggleMarkUnreadUser);

// GET /api/user → return all users except current user
userRouter.get("/", isAuth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("name image");
    res.status(200).json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default userRouter;