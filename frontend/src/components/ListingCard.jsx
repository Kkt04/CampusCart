import { Link } from "react-router-dom";
import { API_URL, cropStyle } from "../api";

export default function ListingCard({ listing }) {
  const imageUrl = listing.imageUrl
    ? listing.imageUrl.startsWith("/uploads")
      ? `${API_URL}${listing.imageUrl}`
      : listing.imageUrl
    : null;

  return (
    <Link to={`/listing/${listing._id}`} className="card">
      <span className={`card-badge ${listing.type}`}>
        {listing.type === "buy" ? "FOR SALE" : "FOR RENT"}
      </span>
      {listing.urgent && <span className="card-badge urgent">LEAVING SOON</span>}

      <div className="card-img">
        {imageUrl ? (
          <img src={imageUrl} alt={listing.title} style={cropStyle(listing)} />
        ) : (
          <span>No photo added</span>
        )}
      </div>

      <div className="card-body">
        <span className="card-cat">
          {listing.category} / {listing.subcategory}
        </span>
        <span className="card-title">{listing.title}</span>
        <span className="card-meta">
          {listing.seller?.hostelBlock || listing.seller?.university || "Campus"}
        </span>
        <span className="card-price">
          ₹{listing.price}
          {listing.type === "rent" ? ` / ${listing.rentDuration?.replace("per ", "")}` : ""}
        </span>
      </div>
    </Link>
  );
}
