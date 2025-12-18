import { useEffect, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  card: "",
  exp: "",
  cvc: ""
};

export default function PaymentModal({ open, onClose, item, onConfirm }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [processing, setProcessing] = useState(false);

  const trimmedName = form.name.trim();
  const trimmedEmail = form.email.trim();
  const normalizedCard = form.card.replace(/\s+/g, "");
  const normalizedExp = form.exp.trim();
  const normalizedCvc = form.cvc.trim();
  const isValidEmail = /\S+@\S+\.\S+/.test(trimmedEmail);
  const isValidCard = /^\d{13,19}$/.test(normalizedCard);
  const isValidExp = /^(0[1-9]|1[0-2])\/\d{2}$/.test(normalizedExp);
  const isValidCvc = /^\d{3,4}$/.test(normalizedCvc);
  const canSubmit = trimmedName.length > 1 && isValidEmail && isValidCard && isValidExp && isValidCvc;

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setStatus("");
      setProcessing(false);
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setStatus("Enter valid name, email, card, expiry, and CVC to continue.");
      return;
    }
    setProcessing(true);
    setStatus("Processing...");
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        card: normalizedCard,
        exp: normalizedExp,
        cvc: normalizedCvc
      };
      const result = onConfirm ? await onConfirm(payload) : { ok: true };
      if (result && result.ok === false) {
        throw new Error(result.message || "Payment failed. Please try again.");
      }
      setStatus("Payment confirmed. Reservation created.");
      setTimeout(() => {
        setStatus("");
        onClose && onClose("success");
      }, 1000);
    } catch (err) {
      setProcessing(false);
      setStatus(err?.message || "Payment failed. Please try again.");
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 16
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 14,
        maxWidth: 520,
        width: "100%",
        padding: 20,
        boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
        border: "1px solid var(--border)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Checkout</h3>
          <button className="btn btn-ghost" onClick={() => onClose && onClose("cancel")}>Close</button>
        </div>
        <p style={{ color: "var(--muted)" }}>
          {item?.title || "Reservation"} — {item?.amount ? `EUR ${item.amount}` : "no charge (demo)"}
        </p>
        {item?.description && <p style={{ color: "var(--muted)", marginTop: -8 }}>{item.description}</p>}
        <form onSubmit={handleSubmit} className="form-grid" style={{ display: "grid", gap: 10 }}>
          <label>
            Full name
            <input name="name" value={form.name} onChange={handleChange} />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </label>
          <label>
            Card number
            <input name="card" value={form.card} onChange={handleChange} placeholder="4242 4242 4242 4242" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label>
              Exp
              <input name="exp" value={form.exp} onChange={handleChange} placeholder="12/30" />
            </label>
            <label>
              CVC
              <input name="cvc" value={form.cvc} onChange={handleChange} placeholder="123" />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit || processing}>
            Pay & confirm
          </button>
          {status && <div style={{ color: "var(--muted)" }}>{status}</div>}
        </form>
      </div>
    </div>
  );
}
