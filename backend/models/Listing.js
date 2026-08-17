const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
    type: { type: String, enum: ["buy", "rent"], required: true },
    price: { type: Number, required: true },
    rentDuration: { type: String, enum: ["per day", "per week", "per month", ""], default: "" },
    securityDeposit: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    cropX: { type: Number, default: 50 },
    cropY: { type: Number, default: 50 },
    zoom: { type: Number, default: 1 },
    condition: { type: String, enum: ["New", "Like New", "Good", "Fair"], default: "Good" },
    location: { type: String, default: "" },
    urgent: { type: Boolean, default: false },
    status: { type: String, enum: ["available", "sold", "rented"], default: "available" },
    views: { type: Number, default: 0 },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", ListingSchema);
