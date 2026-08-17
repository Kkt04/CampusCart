const express = require("express");
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth");

const router = express.Router();

// POST /api/feedback
router.post("/", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Feedback message is required" });
    }

    const feedback = await Feedback.create({
      user: req.user.id,
      name: req.user.name,
      message: message.trim(),
    });

    res.status(201).json({ message: "Thank you for your feedback!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error submitting feedback" });
  }
});

// GET /api/feedback  (admin)
router.get("/", auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching feedback" });
  }
});

module.exports = router;
