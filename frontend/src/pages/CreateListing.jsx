import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import CATEGORIES from "../categories";

export default function CreateListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const viewportRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    type: "buy",
    price: "",
    rentDuration: "per day",
    securityDeposit: "",
    condition: "Good",
    location: "",
    urgent: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [loading, setLoading] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, cx: 50, cy: 50 });

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "price" && Number(value) > 0) setPriceError("");
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setError("");
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setCropX(50);
    setCropY(50);
    setZoom(1);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e) => {
    handleFile(e.target.files[0]);
  };

  const removeImage = () => {
    setImageFile(null);
    setPreview("");
    setCropX(50);
    setCropY(50);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getPos = (e) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const onDragStart = (e) => {
    e.preventDefault();
    setDragging(true);
    const pos = getPos(e);
    dragStart.current = { x: pos.x, y: pos.y, cx: cropX, cy: cropY };
  };

  const onDragMove = useCallback((e) => {
    if (!dragging) return;
    const pos = getPos(e);
    const dx = pos.x - dragStart.current.x;
    const dy = pos.y - dragStart.current.y;
    setCropX(Math.max(0, Math.min(100, dragStart.current.cx - dx)));
    setCropY(Math.max(0, Math.min(100, dragStart.current.cy - dy)));
  }, [dragging]);

  const onDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => onDragMove(e);
    const up = () => onDragEnd();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, onDragMove, onDragEnd]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.category) {
      setError("Please choose a category.");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setPriceError("Price must be greater than 0.");
      return;
    }
    setPriceError("");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        fd.append(k, v);
      });
      if (imageFile) fd.append("image", imageFile);
      fd.append("cropX", cropX);
      fd.append("cropY", cropY);
      fd.append("zoom", zoom);

      const res = await api.post("/listings", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/listing/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create listing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="container section" style={{ maxWidth: 640 }}>
        <h2 className="section-title">List something on the board</h2>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit} className="detail-panel">
          <div className="field">
            <label>What are you listing?</label>
            <input className="text-input" required value={form.title} onChange={set("title")} placeholder="e.g. Blazer for placement season" />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={set("description")} placeholder="Condition, size, why you're letting it go..." />
          </div>

          <div className="field">
            <label>Buy or Rent?</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn buy ${form.type === "buy" ? "active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, type: "buy" }))}
              >
                Sell (Buy)
              </button>
              <button
                type="button"
                className={`toggle-btn rent ${form.type === "rent" ? "active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, type: "rent" }))}
              >
                Rent Out
              </button>
            </div>
          </div>

          <div className="field">
            <label>Category</label>
            <select
              className="select"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category</option>
              {Object.keys(CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{form.type === "rent" ? "Rent price (₹)" : "Sale price (₹)"}</label>
            <input
              className={`text-input ${priceError ? "input-error" : ""}`}
              type="number"
              min="1"
              required
              value={form.price}
              onChange={set("price")}
              placeholder="Enter price"
            />
            {priceError && <span className="field-error">{priceError}</span>}
          </div>

          {form.type === "rent" && (
            <>
              <div className="field">
                <label>Rent duration</label>
                <select className="select" value={form.rentDuration} onChange={set("rentDuration")}>
                  <option value="per day">Per day</option>
                  <option value="per week">Per week</option>
                  <option value="per month">Per month</option>
                </select>
              </div>
              <div className="field">
                <label>Security deposit (₹, optional)</label>
                <input className="text-input" type="number" min="0" value={form.securityDeposit} onChange={set("securityDeposit")} />
              </div>
            </>
          )}

          <div className="field">
            <label>Photo (optional)</label>
            {preview ? (
              <div className="crop-editor">
                <div
                  className="crop-viewport"
                  ref={viewportRef}
                  onMouseDown={onDragStart}
                  onTouchStart={onDragStart}
                >
                  <img
                    src={preview}
                    alt="Crop preview"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: `${cropX}% ${cropY}%`,
                      transform: `scale(${zoom})`,
                      pointerEvents: "none",
                    }}
                  />
                  <button type="button" className="upload-remove" onClick={removeImage}>
                    ✕
                  </button>
                </div>
                <div className="crop-controls">
                  <label>🔍</label>
                  <input
                    type="range"
                    className="crop-slider"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                  <span>{zoom.toFixed(1)}x</span>
                </div>
                <p className="crop-hint">Drag the image to reposition, use the slider to zoom</p>
              </div>
            ) : (
              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="upload-icon">📷</div>
                <p className="upload-text">Click or drag a photo here</p>
                <p className="upload-hint">JPG, PNG up to 5 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
          </div>

          <div className="field">
            <label>Condition</label>
            <select className="select" value={form.condition} onChange={set("condition")}>
              <option>New</option>
              <option>Like New</option>
              <option>Good</option>
              <option>Fair</option>
            </select>
          </div>

          <div className="field">
            <label>Pickup location (hostel/block)</label>
            <input className="text-input" value={form.location} onChange={set("location")} placeholder="e.g. Boys Hostel Block C" />
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={form.urgent} onChange={set("urgent")} />
            I'm leaving campus soon — mark as urgent
          </label>

          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={loading}>
            {loading ? "Posting..." : "Post listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
