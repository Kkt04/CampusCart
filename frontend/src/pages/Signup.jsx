import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    university: "",
    hostelBlock: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Join CampusCart</h2>
        <p className="sub">Buy, sell and rent stuff with people on your own campus.</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input className="text-input" required value={form.name} onChange={handleChange("name")} />
          </div>
          <div className="field">
            <label>College email</label>
            <input
              className="text-input"
              type="email"
              required
              value={form.email}
              onChange={handleChange("email")}
              placeholder="you@university.edu"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="text-input"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange("password")}
            />
          </div>
          <div className="field">
            <label>University name</label>
            <input
              className="text-input"
              required
              value={form.university}
              onChange={handleChange("university")}
              placeholder="e.g. Rishihood University"
            />
          </div>
          <div className="field">
            <label>Hostel / Block (optional)</label>
            <input
              className="text-input"
              value={form.hostelBlock}
              onChange={handleChange("hostelBlock")}
              placeholder="e.g. Block C, Room 214"
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="switch-line">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
