const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Listing = require("../models/Listing");
const auth = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chat-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// POST /api/chat/start  { listingId }
router.post("/start", auth, async (req, res) => {
  try {
    const { listingId } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.seller.toString() === req.user.id) {
      return res.status(400).json({ message: "You can't message yourself about your own listing" });
    }

    let conversation = await Conversation.findOne({
      listing: listingId,
      participants: { $all: [req.user.id, listing.seller] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        listing: listingId,
        participants: [req.user.id, listing.seller],
      });

      await Message.create({
        conversation: conversation._id,
        sender: listing.seller,
        text: "",
        image: "",
        listing: listing._id,
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: "📦 Product shared",
        lastMessageAt: new Date(),
      });

      // Tell all connected sockets to join this new room
      const io = req.app.get("io");
      if (io) io.emit("conversation-created", { conversationId: conversation._id.toString() });
    }

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error starting conversation" });
  }
});

// GET /api/chat  -> list of conversations for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate("listing", "title imageUrl price type")
      .populate("participants", "name avatarColor")
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching conversations" });
  }
});

// POST /api/chat/:conversationId/image
router.post("/:conversationId/image", auth, upload.single("image"), async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!req.file) return res.status(400).json({ message: "No image provided" });

    const imageUrl = `/uploads/${req.file.filename}`;

    const message = await Message.create({
      conversation: req.params.conversationId,
      sender: req.user.id,
      text: "",
      image: imageUrl,
    });

    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      lastMessage: "📷 Photo",
      lastMessageAt: new Date(),
    });

    const populated = await message.populate("sender", "name avatarColor");

    const io = req.app.get("io");
    if (io) io.to(req.params.conversationId).emit("new-message", populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error sending image" });
  }
});

// DELETE /api/chat/:conversationId
router.delete("/:conversationId", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Message.deleteMany({ conversation: conversation._id });
    await conversation.deleteOne();

    res.json({ message: "Conversation deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error deleting conversation" });
  }
});

// GET /api/chat/:conversationId/messages
router.get("/:conversationId/messages", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to view this conversation" });
    }

    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate("sender", "name avatarColor")
      .populate("listing", "title price type imageUrl rentDuration condition category subcategory")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

// POST /api/chat/:conversationId/messages/:messageId/reaction  { emoji }
router.post("/:conversationId/messages/:messageId/reaction", auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "Emoji required" });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const currentUsers = message.reactions.get(emoji) || [];
    const userId = req.user.id;

    if (currentUsers.includes(userId)) {
      currentUsers.splice(currentUsers.indexOf(userId), 1);
      if (currentUsers.length === 0) {
        message.reactions.delete(emoji);
      } else {
        message.reactions.set(emoji, currentUsers);
      }
    } else {
      currentUsers.push(userId);
      message.reactions.set(emoji, currentUsers);
    }

    await message.save();

    const io = req.app.get("io");
    if (io) io.to(req.params.conversationId).emit("reaction-updated", { messageId: message._id, reactions: Object.fromEntries(message.reactions) });

    res.json({ reactions: Object.fromEntries(message.reactions) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error toggling reaction" });
  }
});

module.exports = router;
