import { useEffect, useState } from "react";
import api from "../api";

const METHODS = [
  { id: "upi", icon: "📱", label: "UPI", sub: "GPay, PhonePe, Paytm & more" },
  { id: "card", icon: "💳", label: "Card", sub: "Credit / debit card" },
  { id: "cod", icon: "💵", label: "Cash on Delivery", sub: "Pay cash at pickup" },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({ listing, onClose, onPaid }) {
  const isRent = listing.type === "rent";
  const total = listing.price;

  const [step, setStep] = useState("form");
  const [method, setMethod] = useState("upi");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleOnlinePay = async () => {
    setError("");
    setStep("processing");

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway. Check your connection.");

      const order = await api.post("/payments/create-order", {
        listingId: listing._id,
        method,
      });

      const options = {
        key: order.data.keyId,
        amount: order.data.amount,
        currency: order.data.currency,
        order_id: order.data.orderId,
        name: "CampusCart",
        description: listing.title,
        image: "/favicon.ico",
        prefill: { method },
        notes: { listingId: listing._id },
        theme: { color: "#f4a300" },
        handler: async (response) => {
          try {
            const verify = await api.post("/payments/verify", {
              paymentId: order.data.paymentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setResult(verify.data);
            setStep("success");
            if (onPaid) onPaid();
          } catch (err) {
            setError(err.response?.data?.message || "Payment verification failed.");
            setStep("form");
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled.");
            setStep("form");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not start payment.");
      setStep("form");
    }
  };

  const handleCod = async () => {
    setError("");
    setStep("processing");

    try {
      const res = await api.post("/payments/cod", { listingId: listing._id });
      setResult(res.data);
      setStep("success");
      if (onPaid) onPaid();
    } catch (err) {
      setError(err.response?.data?.message || "Could not place order.");
      setStep("form");
    }
  };

  const handlePay = () => {
    if (method === "cod") return handleCod();
    return handleOnlinePay();
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
            <p className="modal-sub">
              Secured by Razorpay · 5% platform fee supports CampusCart.
            </p>

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

            {method === "cod" && (
              <div className="pay-cod-note">
                📍 Pay in cash when you meet the seller
                {listing.location ? ` at ${listing.location}` : ""}. No online payment needed.
              </div>
            )}

            {error && <div className="modal-status error">{error}</div>}

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
                disabled={step === "processing"}
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
                : `₹${total} paid securely via ${method === "upi" ? "UPI" : "card"}.`}
            </p>
            {result && (
              <p className="pay-demo-note">
                {result.paymentId ? `Payment ID: ${result.paymentId}` : ""}
                {result.adminFee != null && result.sellerPayout != null
                  ? `${result.paymentId ? " · " : ""}₹${(result.sellerPayout / 100).toFixed(2)} to seller · ₹${(result.adminFee / 100).toFixed(2)} platform fee`
                  : ""}
              </p>
            )}
            <button className="btn btn-primary btn-block" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
