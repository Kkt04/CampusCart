require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const User = require("./models/User");
const Listing = require("./models/Listing");

const AVATAR_COLORS = ["#F4A300", "#FF6B57", "#7FB069", "#C9C2E8", "#4EA8DE"];

async function seed() {
  await connectDB();

  const existingUser = await User.findOne({ email: "rahul@iitd.ac.in" });
  let user;

  if (existingUser) {
    user = existingUser;
    console.log("👤 Dummy user already exists:", user.email);
  } else {
    const hashed = await bcrypt.hash("password123", 10);
    user = await User.create({
      name: "Rahul Verma",
      email: "rahul@iitd.ac.in",
      password: hashed,
      university: "IIT Delhi",
      hostelBlock: "Block C, Kailash Hostel",
      avatarColor: AVATAR_COLORS[2],
    });
    console.log("✅ Created dummy user:", user.email, "/ password123");
  }

  const existingListings = await Listing.countDocuments({ seller: user._id });
  if (existingListings > 0) {
    console.log(`📦 User already has ${existingListings} listings, skipping.`);
    process.exit(0);
  }

  const listings = [
    {
      title: "Scientific Calculator — Casio fx-991EX",
      description: "Used for one semester. Works perfectly, all functions intact. Selling because I graduated.",
      category: "Electronics",
      subcategory: "Calculators",
      type: "buy",
      price: 850,
      condition: "Like New",
      location: "Kailash Hostel, Block C",
      urgent: false,
      seller: user._id,
    },
    {
      title: "Formal Blazer — Navy Blue, Size M",
      description: "Placement season blazer. Worn twice. Fits 5'8\"-5'10\" build. No tears or stains.",
      category: "Clothing",
      subcategory: "Formal Wear",
      type: "buy",
      price: 1200,
      condition: "Good",
      location: "Kailash Hostel, Block C",
      urgent: true,
      seller: user._id,
    },
    {
      title: "Study Table + Chair — IKEA MICKE",
      description: "Solid study table with drawer. Chair included. Pick up from my room. Moving out next week!",
      category: "Furniture",
      subcategory: "Study Table",
      type: "rent",
      price: 300,
      rentDuration: "per month",
      securityDeposit: 1000,
      condition: "Good",
      location: "Kailash Hostel, Block C, Room 214",
      urgent: true,
      seller: user._id,
    },
    {
      title: "Class 12 NCERT Physics — Full Set",
      description: "Complete set of Vol 1 and Vol 2. Some highlighting inside but pages are clean.",
      category: "Books",
      subcategory: "Semester Textbooks",
      type: "buy",
      price: 350,
      condition: "Fair",
      location: "Near Library Gate",
      urgent: false,
      seller: user._id,
    },
    {
      title: "Cricket Bat — SG Nexus Plus",
      description: "Short handle, English willow. Knocked in and match-ready. Grip is fresh.",
      category: "Sports Gear",
      subcategory: "Cricket",
      type: "rent",
      price: 150,
      rentDuration: "per day",
      securityDeposit: 500,
      condition: "Good",
      location: "Sports Complex",
      urgent: false,
      seller: user._id,
    },
    {
      title: "JBL Tune 510BT Headphones",
      description: "Wireless on-ear headphones. Battery lasts ~30 hrs. Minor scratches on headband.",
      category: "Electronics",
      subcategory: "Headphones",
      type: "buy",
      price: 1100,
      condition: "Good",
      location: "Kailash Hostel, Block C",
      urgent: false,
      seller: user._id,
    },
  ];

  await Listing.insertMany(listings);
  console.log(`✅ Created ${listings.length} dummy listings`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
