import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import api from "../api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadIds } = useSocket();
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setSubmitting(true);
    setFeedbackStatus("");
    try {
      await api.post("/feedback", { message: feedbackMsg });
      setFeedbackStatus("Thanks! Your feedback has been recorded.");
      setFeedbackMsg("");
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackStatus("");
      }, 2000);
    } catch (err) {
      setFeedbackStatus(err.response?.data?.message || "Could not submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="brand">
            Campus<span className="dot">Cart</span>
          </Link>
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? "✕" : "☰"}
          </button>
          <div className={`nav-links ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)}>
            <Link to="/">Browse</Link>
            {user && <Link to="/create">Sell / Rent Out</Link>}
            {user && (
              <Link to="/chat" className="nav-chat-link">
                Chats
                {unreadIds.size > 0 && <span className="nav-dot" />}
              </Link>
            )}
            {user && (
              <button className="nav-feedback-btn" onClick={() => setShowFeedback(true)}>
                Feedback
              </button>
            )}
            {user ? (
              <>
                <Link to="/profile">My Listings</Link>
                <button onClick={handleLogout}>Logout</button>
                <div
                  className="nav-avatar"
                  style={{ background: user.avatarColor }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup" className="nav-cta">
                  Join Campus
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Send us your feedback</h3>
            <p className="modal-sub">Help us make CampusCart better for everyone on campus.</p>
            <form onSubmit={submitFeedback}>
              <textarea
                className="modal-textarea"
                rows={4}
                placeholder="What do you think? Feature requests, bugs, ideas..."
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
                required
              />
              {feedbackStatus && (
                <div className={`modal-status ${feedbackStatus.startsWith("Thanks") ? "success" : "error"}`}>
                  {feedbackStatus}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost modal-cancel" onClick={() => setShowFeedback(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !feedbackMsg.trim()}>
                  {submitting ? "Sending..." : "Send Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
