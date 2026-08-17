import { useEffect, useState } from "react";
import api, { API_URL, cropStyle } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/listings/mine").then((res) => setListings(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markStatus = async (id, status) => {
    await api.patch(`/listings/${id}`, { status });
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this listing?")) return;
    await api.delete(`/listings/${id}`);
    load();
  };

  return (
    <div className="app-shell">
      <div className="container section">
        <h2 className="section-title">Hey, {user?.name} 👋</h2>
        <p style={{ color: "rgba(27,31,59,0.6)", marginTop: -10, marginBottom: 24 }}>
          {user?.university} {user?.hostelBlock ? `· ${user.hostelBlock}` : ""}
        </p>

        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>My listings</h3>

        {loading ? (
          <p>Loading...</p>
        ) : listings.length === 0 ? (
          <p style={{ color: "rgba(27,31,59,0.6)" }}>You haven't listed anything yet.</p>
        ) : (
          <div className="listing-grid" style={{ marginTop: 16 }}>
            {listings.map((l) => {
              const img = l.imageUrl
                ? l.imageUrl.startsWith("/uploads")
                  ? `${API_URL}${l.imageUrl}`
                  : l.imageUrl
                : null;

              return (
                <div key={l._id} className="card">
                  <span className={`card-badge ${l.type}`}>{l.type === "buy" ? "FOR SALE" : "FOR RENT"}</span>
                  <div className="card-img">
                    {img ? <img src={img} alt={l.title} style={cropStyle(l)} /> : <span>No photo</span>}
                  </div>
                  <div className="card-body">
                    <span className="card-cat">{l.category} / {l.subcategory}</span>
                    <span className="card-title">{l.title}</span>
                    <span className="card-meta">
                      Status: <b>{l.status}</b> · {l.views} views
                    </span>
                    <span className="card-price">₹{l.price}</span>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {l.status === "available" ? (
                        <button
                          className="btn btn-dark"
                          style={{ padding: "8px 12px", fontSize: 12 }}
                          onClick={() => markStatus(l._id, l.type === "rent" ? "rented" : "sold")}
                        >
                          Mark {l.type === "rent" ? "Rented" : "Sold"}
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "8px 12px", fontSize: 12, borderColor: "var(--ink)", color: "var(--ink)" }}
                          onClick={() => markStatus(l._id, "available")}
                        >
                          Relist
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "8px 12px", fontSize: 12, borderColor: "var(--coral)", color: "var(--coral)" }}
                        onClick={() => remove(l._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
