import { useEffect, useState } from "react";
import api from "../api";
import CATEGORIES from "../categories";
import ListingCard from "../components/ListingCard";

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      if (type) params.type = type;
      if (search) params.search = search;
      const res = await api.get("/listings", { params });
      setListings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, type]);

  useEffect(() => {
    const t = setTimeout(fetchListings, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="app-shell">
      <section className="hero">
        <div className="container">
          <span className="hero-tape">PINNED TO THE CAMPUS BOARD</span>
          <h1>
            Your hostel's <span className="hl">marketplace</span>, minus the middleman.
          </h1>
          <p>
            Buy what you need, rent what you'll use once, and sell what's just sitting in your
            cupboard — all with people from your own campus. Chat right on the listing, no
            random numbers needed.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <b>{listings.length}</b>
              <span>LIVE LISTINGS</span>
            </div>
            <div className="hero-stat">
              <b>{Object.keys(CATEGORIES).length}</b>
              <span>CATEGORIES</span>
            </div>
            <div className="hero-stat">
              <b>BUY + RENT</b>
              <span>YOUR CHOICE</span>
            </div>
          </div>
        </div>
      </section>

      <div className="category-bar">
        <div className="container">
          <div className="category-row">
            <button
              className={`category-tab ${category === "" ? "active" : ""}`}
              onClick={() => setCategory("")}
            >
              All Categories
            </button>
            {Object.keys(CATEGORIES).map((cat) => (
              <button
                key={cat}
                className={`category-tab ${category === cat ? "active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="filter-row">
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Buy or Rent</option>
              <option value="buy">Buy only</option>
              <option value="rent">Rent only</option>
            </select>

            <input
              className="text-input"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <h2 className="section-title">
            {loading ? "Loading listings..." : `${listings.length} things up for grabs`}
          </h2>

          {!loading && listings.length === 0 && (
            <p style={{ color: "rgba(27,31,59,0.6)" }}>
              Nothing here yet — be the first to list something in this category.
            </p>
          )}

          <div className="listing-grid">
            {listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">CampusCart — built by students, for students.</footer>
    </div>
  );
}
