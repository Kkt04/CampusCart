import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { API_URL, cropStyle } from "../api";
import { useAuth } from "../context/AuthContext";
import PaymentModal from "../components/PaymentModal";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/listings/${id}`)
      .then((res) => setListing(res.data))
      .catch(() => setError("Listing not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuyClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowPayment(true);
  };

  const handleChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setStarting(true);
    try {
      const res = await api.post("/chat/start", { listingId: id });
      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start chat");
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="app-shell container section">Loading...</div>;
  if (error && !listing) return <div className="app-shell container section">{error}</div>;

  const isOwner = user && listing.seller?._id === user.id;

  const imageUrl = listing.imageUrl
    ? listing.imageUrl.startsWith("/uploads")
      ? `${API_URL}${listing.imageUrl}`
      : listing.imageUrl
    : null;

  return (
    <div className="app-shell">
      <div className="container section">
        <div className="detail-grid">
          <div>
            <div className="detail-img">
              {imageUrl ? (
                <img src={imageUrl} alt={listing.title} style={cropStyle(listing)} />
              ) : (
                <span style={{ fontFamily: "var(--font-display)", opacity: 0.5 }}>No photo added</span>
              )}
            </div>
          </div>

          <div className="detail-panel">
            <span className={`card-badge ${listing.type}`} style={{ position: "static", display: "inline-block", marginBottom: 10 }}>
              {listing.type === "buy" ? "FOR SALE" : "FOR RENT"}
            </span>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "4px 0" }}>{listing.title}</h1>
            <p style={{ color: "var(--sky)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
              {listing.category} / {listing.subcategory} · {listing.condition}
            </p>

            <p style={{ margin: "16px 0", lineHeight: 1.6 }}>{listing.description || "No description provided."}</p>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, margin: "10px 0" }}>
              ₹{listing.price}
              {listing.type === "rent" ? ` / ${listing.rentDuration?.replace("per ", "")}` : ""}
            </div>

            {listing.type === "rent" && listing.securityDeposit > 0 && (
              <p style={{ fontSize: 13.5, color: "rgba(27,31,59,0.65)" }}>
                + ₹{listing.securityDeposit} refundable security deposit
              </p>
            )}

            {listing.location && (
              <p style={{ fontSize: 13.5, color: "rgba(27,31,59,0.65)" }}>📍 Pickup: {listing.location}</p>
            )}

            <div className="seller-box">
              <div className="seller-avatar" style={{ background: listing.seller?.avatarColor || "#F4A300" }}>
                {listing.seller?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{listing.seller?.name}</div>
                <div style={{ fontSize: 12.5, color: "rgba(27,31,59,0.6)" }}>
                  {listing.seller?.university} {listing.seller?.hostelBlock ? `· ${listing.seller.hostelBlock}` : ""}
                </div>
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            {!isOwner ? (
              <div className="detail-actions">
                {listing.status === "available" && (
                  <button
                    className="btn btn-primary btn-block"
                    onClick={handleBuyClick}
                    disabled={starting}
                  >
                    {listing.type === "buy"
                      ? `🛒 Buy this for ₹${listing.price}`
                      : `🔑 Rent this for ₹${listing.price}/${listing.rentDuration?.replace("per ", "")}`}
                  </button>
                )}
                {listing.status !== "available" && (
                  <div className="sold-out-badge">
                    This item has been {listing.status === "sold" ? "sold" : "rented out"}
                  </div>
                )}
                <button className="btn btn-block" style={{ background: "transparent", color: "var(--ink)", borderColor: "var(--ink)" }} onClick={handleChat} disabled={starting}>
                  💬 Chat with seller
                </button>
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(27,31,59,0.55)" }}>
                This is your own listing.
              </p>
            )}
          </div>
        </div>
      </div>
      {showPayment && (
        <PaymentModal
          listing={listing}
          onClose={() => setShowPayment(false)}
          onPaid={() => {
            api
              .get(`/listings/${id}`)
              .then((res) => setListing(res.data))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
