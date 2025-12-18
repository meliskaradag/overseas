import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import ChatWindow from "../components/ChatWindow";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    title: "",
    city: "",
    country: "",
    price: "",
    type: "entire_place",
    description: "",
    lat: "",
    lng: "",
    images: ""
  });
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [status, setStatus] = useState("");

  const loadProperties = async () => {
    const res = await api.get("/properties", { params: { ownerId: user.id } });
    setProperties(res.data);
  };

  const loadConversations = async () => {
    const res = await api.get("/conversations");
    setConversations(res.data);
    if (res.data[0]) setActiveConversation(res.data[0].id);
  };

  useEffect(() => {
    if (!user) return;
    loadProperties();
    loadConversations();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        images: form.images
          ? form.images.split(",").map((s) => s.trim()).filter(Boolean)
          : []
      };
      const res = await api.post("/properties", payload);
      setStatus("Listing created");
      setForm({
        title: "",
        city: "",
        country: "",
        price: "",
        type: "entire_place",
        description: "",
        lat: "",
        lng: "",
        images: ""
      });
      setProperties((prev) => [res.data, ...prev]);
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not create listing");
    }
  };

  return (
    <div className="main-content">
      <h1>Owner console</h1>
      <p style={{ color: "var(--muted)" }}>
        Manage your listings and see incoming conversations.
      </p>

      <div className="grid-two" style={{ alignItems: "start", gap: 16 }}>
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Create listing</h3>
          <form onSubmit={handleSubmit} className="form-grid" style={{ display: "grid", gap: 10 }}>
            <label>
              Title
              <input name="title" value={form.title} onChange={handleChange} required />
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={handleChange} required />
            </label>
            <label>
              Country
              <input name="country" value={form.country} onChange={handleChange} required />
            </label>
            <label>
              Price (EUR/month)
              <input name="price" type="number" value={form.price} onChange={handleChange} required />
            </label>
            <label>
              Type
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="entire_place">Entire place</option>
                <option value="shared_room">Shared room</option>
                <option value="studio">Studio</option>
                <option value="loft">Loft</option>
              </select>
            </label>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} />
            </label>
            <label>
              Latitude (optional)
              <input name="lat" value={form.lat} onChange={handleChange} />
            </label>
            <label>
              Longitude (optional)
              <input name="lng" value={form.lng} onChange={handleChange} />
            </label>
            <label>
              Image URLs (comma separated)
              <textarea
                name="images"
                value={form.images}
                onChange={handleChange}
                placeholder="https://... , https://..."
              />
            </label>
            <button className="btn btn-primary" type="submit">
              Publish listing
            </button>
            {status && <div style={{ color: "var(--muted)" }}>{status}</div>}
          </form>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Your listings ({properties.length})</h3>
          {properties.length === 0 && <p style={{ color: "var(--muted)" }}>No listings yet.</p>}
          <div className="grid-two" style={{ gap: 10 }}>
            {properties.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#f8fafc"
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div style={{ color: "var(--muted)" }}>
                  {p.city}, {p.country}
                </div>
                <div style={{ fontWeight: 600 }}>EUR {p.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Messages</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`btn ${activeConversation === c.id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveConversation(c.id)}
              >
                Conversation {c.id}
              </button>
            ))}
            {conversations.length === 0 && (
              <span style={{ color: "var(--muted)" }}>No conversations yet.</span>
            )}
          </div>
          <div>
            <ChatWindow conversationId={activeConversation} />
          </div>
        </div>
      </div>
    </div>
  );
}
