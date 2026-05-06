import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import { errorHandler, notFound, requireDatabase } from "./middleware/errorMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import appreciationRoutes from "./routes/appreciationRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import moodRoutes from "./routes/moodRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*" }
});

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

connectDB();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: PORT });
});

app.use(requireDatabase);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/payrolls", payrollRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/appreciations", appreciationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

// SOCKET.IO
const onlineUsers = new Map();

io.on("connection", (socket) => {

  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("sendMessage", async (data) => {
    const msg = await Message.create(data);
    await Notification.create({
      recipient: data.receiver,
      sender: data.sender,
      type: "message",
      title: "New chat message",
      message: data.text,
      link: "/chat"
    });
    io.emit("receiveMessage", msg);

    io.emit("notification", {
      message: `New message from ${data.sender}`
    });
  });

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("messageSeen", async (id) => {
    await Message.findByIdAndUpdate(id, { seen: true });
    io.emit("messageSeenUpdate", id);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
    return;
  }

  console.error("Server failed to start", error);
});
