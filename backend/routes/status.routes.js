import express from "express";
import isAuth from "../middlewares/isAuth.js";
import upload from "../middlewares/upload.js";
import {
  addStatus,
  getStatuses,
  deleteStatus,
  markStatusViewed,
  getStatusViewers,
  likeStatus,
  unlikeStatus,
  replyStatus,
} from "../controllers/status.controller.js";

const router = express.Router();

// POST /api/status → upload status
router.post("/", isAuth, upload.single("media"), addStatus);

// GET /api/status → get all statuses
router.get("/", isAuth, getStatuses);

// DELETE /api/status/:id → delete status
router.delete("/:id", isAuth, deleteStatus);

// POST /api/status/:id/view → mark status as viewed
router.post("/:id/view", isAuth, markStatusViewed);

// GET /api/status/:id/viewers → get viewers for a specific status (owner only)
router.get("/:id/viewers", isAuth, getStatusViewers);

// POST /api/status/:id/like → like a status
router.post("/:id/like", isAuth, likeStatus);

// POST /api/status/:id/unlike → unlike a status
router.post("/:id/unlike", isAuth, unlikeStatus);

// POST /api/status/:id/reply → reply to a status
router.post("/:id/reply", isAuth, replyStatus);

export default router;
