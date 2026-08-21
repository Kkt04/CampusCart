import { useState } from "react";

const METHODS = [
  { id: "upi", icon: "📱", label: "UPI", sub: "Pay via any UPI app" },
  { id: "card", icon: "💳", label: "Card", sub: "Credit / debit card" },
  { id: "cod", icon: "💵", label: "Cash on Delivery", sub: "Pay cash at pickup" },
];

export default function PaymentModal({ listing, onClose }) {
  const isRent = listing.type === "rent";
  const total = listing.price;

  const [step, setStep] = useState("form");
  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [orderId] = useState(() => `CC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  const formatCardNumber = (v) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const canPay =
    method === "cod" ||
    (method === "upi" && upiId.trim().length > 0) ||
    (method === "card" &&
      cardNumber.replace(/\s/g, "").length >= 12 &&
      cardName.trim().length > 0 &&
      expiry.length === 5 &&
      cvv.length >= 3);

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => setStep("success"), 1800);
  };

  const payLabel = () => {
    if (step === "processing") return "Processing...";
    if (method === "cod") return isRent ? "Confirm rental booking" : "Place order";
    return `Pay ₹${total}`;
  };

  return (
    <div className="modal-overlay" onClick={step === "processing" ? undefined : onClose}>
      <div className="modal-card payment-card" onClick={(e) => e.stopPropagation()}>
        {step !== "success" && (
          <>
            <h3 className="modal-title">
              {isRent ? "Complete your rental" : "Complete your purchase"}
            </h3>
            <p className="modal-sub">Demo checkout — no real money moves.</p>

            <div className="pay-summary">
              <div className="pay-summary-row">
                <span>{listing.title}</span>
                <span>₹{listing.price}</span>
              </div>
              <div className="pay-summary-row total">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            <div className="pay-methods">
              {METHODS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`pay-method ${method === m.id ? "active" : ""}`}
                  onClick={() => setMethod(m.id)}
                  disabled={step === "processing"}
                >
                  <span className="pay-method-icon">{m.icon}</span>
                  <span className="pay-method-text">
                    <span className="pay-method-label">{m.label}</span>
                    <span className="pay-method-sub">{m.sub}</span>
                  </span>
                  <span className="pay-radio" />
                </button>
              ))}
            </div>

            {method === "upi" && (
              <div className="pay-fields">
                <label className="pay-label">UPI ID</label>
                <input
                  className="pay-input"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  disabled={step === "processing"}
                />
              </div>
            )}

            {method === "card" && (
              <div className="pay-fields">
                <label className="pay-label">Card number</label>
                <input
                  className="pay-input"
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  disabled={step === "processing"}
                />
                <label className="pay-label">Name on card</label>
                <input
                  className="pay-input"
                  placeholder="Full name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={step === "processing"}
                />
                <div className="pay-field-row">
                  <div>
                    <label className="pay-label">Expiry</label>
                    <input
                      className="pay-input"
                      placeholder="MM/YY"
                      inputMode="numeric"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      disabled={step === "processing"}
                    />
                  </div>
                  <div>
                    <label className="pay-label">CVV</label>
                    <input
                      className="pay-input"
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      inputMode="numeric"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                      disabled={step === "processing"}
                    />
                  </div>
                </div>
              </div>
            )}

            {method === "cod" && (
              <div className="pay-cod-note">
                📍 Pay in cash when you meet the seller
                {listing.location ? ` at ${listing.location}` : ""}. No online payment needed.
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost modal-cancel"
                onClick={onClose}
                disabled={step === "processing"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePay}
                disabled={!canPay || step === "processing"}
              >
                {payLabel()}
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="pay-success">
            <div className="success-check">✓</div>
            <h3 className="modal-title" style={{ marginTop: 14 }}>
              {method === "cod" ? "Order placed!" : "Payment successful!"}
            </h3>
            <p className="modal-sub">
              {method === "cod"
                ? `Pay ₹${total} in cash at pickup.`
                : `₹${total} paid via ${method === "upi" ? "UPI" : "card"}`}
              {" · "}Order {orderId}
            </p>
            <p className="pay-demo-note">(Demo mode — no real transaction was made.)</p>
            <button className="btn btn-primary btn-block" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
