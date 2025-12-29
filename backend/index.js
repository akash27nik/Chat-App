import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/message.routes.js";
import statusRoutes from "./routes/status.routes.js";
import { app, server } from "./socket/socket.js";

dotenv.config();

const port = process.env.PORT || 5000;

// ✅ Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("📂 Created uploads folder");
}


// ✅ Middleware
const allowedOrigins = [
  "https://chit-chatfriendly.vercel.app",
  "https://chat-app-frontend-sx6b.onrender.com",  // ✅ for local development
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));


app.use(express.json());
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/message", messageRouter);
app.use("/api/status", statusRoutes);

// ✅ Start server
server.listen(port, async () => {
  try {
    await connectDB();
    console.log(` Server started on port ${port}`);
  } catch (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }
});
