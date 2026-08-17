require("dotenv").config();
const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

const authRoutes = require("./routes/auth");
const listingRoutes = require("./routes/listings");
const chatRoutes = require("./routes/chat");
const feedbackRoutes = require("./routes/feedback");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ---------- Socket.io real-time chat ----------
const onlineUsers = new Map(); // userId → Set of socket ids

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

  // Track online status
  const userId = socket.user.id;
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);
  socket.broadcast.emit("user-online", { userId });

  socket.on("join-conversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("send-message", async ({ conversationId, text, image, replyTo }) => {
    try {
      const msgData = {
        conversation: conversationId,
        sender: socket.user.id,
        text: text || "",
        image: image || "",
      };
      if (replyTo) msgData.replyTo = replyTo;

      const message = await Message.create(msgData);

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: image ? "📷 Photo" : (text || "").trim(),
        lastMessageAt: new Date(),
      });

      const populated = await message.populate("sender", "name avatarColor");

      io.to(conversationId).emit("new-message", populated);
    } catch (err) {
      console.error("send-message error:", err);
      socket.emit("chat-error", { message: "Could not send message" });
    }
  });

  socket.on("typing", ({ conversationId, name }) => {
    socket.to(conversationId).emit("user-typing", { name });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user-offline", { userId });
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 CampusCart backend running on http://localhost:${PORT}`);
  });
});
