const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const Listing = require("../models/Listing");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const auth = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
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

// GET /api/listings  (with optional filters: category, subcategory, type, urgent, search)
router.get("/", async (req, res) => {
  try {
    const { category, subcategory, type, urgent, search } = req.query;
    const filter = { status: "available" };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (type) filter.type = type;
    if (urgent === "true") filter.urgent = true;
    if (search) filter.title = { $regex: search, $options: "i" };

    const listings = await Listing.find(filter)
      .populate("seller", "name university hostelBlock avatarColor rating")
      .sort({ urgent: -1, createdAt: -1 });

    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching listings" });
  }
});

// GET /api/listings/mine
router.get("/mine", auth, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user.id }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching your listings" });
  }
});

// GET /api/listings/:id
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("seller", "name university hostelBlock avatarColor rating");

    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching listing" });
  }
});

// POST /api/listings
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      type,
      price,
      rentDuration,
      securityDeposit,
      condition,
      location,
      urgent,
      cropX,
      cropY,
      zoom,
    } = req.body;

    if (!title || !category || !type || !price || Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const listing = await Listing.create({
      title,
      description,
      category,
      subcategory: subcategory || "Others",
      type,
      price,
      rentDuration: type === "rent" ? rentDuration || "per day" : "",
      securityDeposit: type === "rent" ? securityDeposit || 0 : 0,
      imageUrl,
      cropX: cropX ? Number(cropX) : 50,
      cropY: cropY ? Number(cropY) : 50,
      zoom: zoom ? Number(zoom) : 1,
      condition,
      location,
      urgent: !!urgent,
      seller: req.user.id,
    });

    res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating listing" });
  }
});

// PATCH /api/listings/:id  (update status, price, title, description, urgent)
router.patch("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to edit this listing" });
    }

    const oldStatus = listing.status;

    const allowed = ["status", "price", "title", "description", "urgent", "cropX", "cropY", "zoom"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });

    if (req.file) {
      listing.imageUrl = `/uploads/${req.file.filename}`;
    }

    await listing.save();

    // Send system message if status changed to sold/rented
    if (req.body.status && req.body.status !== oldStatus && (req.body.status === "sold" || req.body.status === "rented")) {
      const conversations = await Conversation.find({ listing: listing._id });
      const SYSTEM_USER = "000000000000000000000000";
      const label = req.body.status === "sold" ? "sold" : "rented out";

      for (const conv of conversations) {
        const sysMsg = await Message.create({
          conversation: conv._id,
          sender: SYSTEM_USER,
          text: `✅ "${listing.title}" has been ${label} by the seller.`,
          system: true,
        });

        await Conversation.findByIdAndUpdate(conv._id, {
          lastMessage: `✅ ${listing.title} ${label}`,
          lastMessageAt: new Date(),
        });

        const io = req.app.get("io");
        if (io) io.to(conv._id.toString()).emit("new-message", sysMsg);
      }
    }

    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: "Server error updating listing" });
  }
});

// DELETE /api/listings/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this listing" });
    }

    // Send system message to all conversations about this listing
    const conversations = await Conversation.find({ listing: listing._id });
    const SYSTEM_USER = "000000000000000000000000";

    for (const conv of conversations) {
      const sysMsg = await Message.create({
        conversation: conv._id,
        sender: SYSTEM_USER,
        text: `⚠️ "${listing.title}" has been deleted by the seller.`,
        system: true,
      });

      await Conversation.findByIdAndUpdate(conv._id, {
        lastMessage: `⚠️ ${listing.title} deleted`,
        lastMessageAt: new Date(),
      });

      const io = req.app.get("io");
      if (io) io.to(conv._id.toString()).emit("new-message", sysMsg);
    }

    await listing.deleteOne();
    res.json({ message: "Listing deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error deleting listing" });
  }
});

module.exports = router;
