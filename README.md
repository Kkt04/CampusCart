# CampusCart

A university-only marketplace: buy, sell, and **rent** items with people from your own
campus, and chat with them in real time — right from the listing.

Built with **React (Vite) + Node.js/Express + MongoDB + Socket.io**.

---

## 1. What's inside

```
campus-cart/
├── backend/
│   ├── config/db.js          MongoDB connection
│   ├── middleware/auth.js    JWT auth guard
│   ├── models/                User, Listing, Conversation, Message
│   ├── routes/                auth.js, listings.js, chat.js
│   ├── server.js              Express app + Socket.io real-time chat
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/              Login, Signup, Home, ListingDetail, CreateListing, Chat, Profile
    │   ├── components/         Navbar, ListingCard, ProtectedRoute
    │   ├── context/AuthContext.jsx
    │   ├── categories.js       Category → subcategory map
    │   ├── api.js               Axios instance (auto-attaches JWT)
    │   └── styles/index.css    All design tokens + styling
    ├── .env.example
    └── package.json
```

## 2. Prerequisites

- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **MongoDB** running locally, OR a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- npm (comes with Node)

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campuscart     # or your Atlas connection string
JWT_SECRET=make_this_a_long_random_string
CLIENT_URL=http://localhost:5173
```

Run it:

```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start
```

You should see:
```
✅ MongoDB connected
🚀 CampusCart backend running on http://localhost:5000
```

## 4. Frontend setup

Open a **new terminal**:

```bash
cd frontend
npm install
cp .env.example .env
```

`.env` should point to your backend:
```
VITE_API_URL=http://localhost:5000
```

Run it:

```bash
npm run dev
```

Visit **http://localhost:5173** — the site is live.

## 5. Try the full flow

1. Sign up with two different accounts (open one in a normal window, one in incognito) —
   use any email, e.g. `alia@university.edu`.
2. From account A, post a listing (try both **Sell** and **Rent Out**).
3. From account B, open that listing → **Chat with seller** → messages arrive in real time
   via Socket.io on both sides.
4. From account A's **Profile** page, mark the listing **Sold/Rented**, or delete it.

## 6. Notes & next steps

- Images are added via a pasted **image URL** for now (no file upload) — easiest to wire
  Cloudinary/S3 later if you want real photo uploads.
- Payments/escrow, ratings, and "featured listing" monetization aren't wired yet — the
  schema (`User.rating`, `Listing.status`) already has room for them.
- For production: deploy backend (Render/Railway) + MongoDB Atlas + frontend (Vercel/Netlify),
  and update `CLIENT_URL` / `VITE_API_URL` accordingly.

Built for the campus. Ship it. 🚀
# CampusCart
