const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    image: { type: String, default: "" },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", default: null },
    system: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    reactions: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
