import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import ChatWindow from "../components/ChatWindow";
import VideoCall from "../components/VideoCall";

export default function ConsultantDashboard() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docForm, setDocForm] = useState({ name: "", url: "" });
  const [docStatus, setDocStatus] = useState("");

  const loadConvs = async () => {
    const res = await api.get("/conversations");
    setConversations(res.data);
    if (res.data[0]) setSelectedConversationId(res.data[0].id);
  };

  const loadDocs = async () => {
    const res = await api.get("/documents");
    setDocs(res.data);
  };

  useEffect(() => {
    loadConvs();
    loadDocs();
  }, []);

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    setDocStatus("");
    if (!docForm.name || !docForm.url) {
      setDocStatus("Name and URL required");
      return;
    }
    try {
      const res = await api.post("/documents", docForm);
      setDocs((prev) => [res.data, ...prev]);
      setDocForm({ name: "", url: "" });
      setDocStatus("Uploaded");
    } catch (err) {
      setDocStatus(err.response?.data?.message || "Upload failed");
    }
  };

  return (
    <div className="main-content">
      <h1>Consultant console</h1>
      <p style={{ color: "var(--muted)" }}>Hi {user.name}</p>

      <div className="grid-two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Student conversations</h3>
          <ul className="list-clean">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  className={`btn ${selectedConversationId === c.id ? "btn-primary" : "btn-ghost"}`}
                  style={{ width: "100%" }}
                  onClick={() => setSelectedConversationId(c.id)}
                >
                  Conversation {c.id}
                </button>
              </li>
            ))}
            {conversations.length === 0 && (
              <li style={{ color: "var(--muted)" }}>No conversations yet.</li>
            )}
          </ul>
        </div>
        <div>
          <ChatWindow conversationId={selectedConversationId} />
        </div>
      </div>

      <div className="grid-two" style={{ marginTop: 16, gap: 16 }}>
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <h3 style={{ marginTop: 0 }}>Upload documents</h3>
          <form onSubmit={handleDocSubmit} className="form-grid" style={{ display: "grid", gap: 8 }}>
            <label>
              Name
              <input
                name="name"
                value={docForm.name}
                onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label>
              URL
              <input
                name="url"
                value={docForm.url}
                onChange={(e) => setDocForm((f) => ({ ...f, url: e.target.value }))}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit">Upload</button>
            {docStatus && <div style={{ color: "var(--muted)" }}>{docStatus}</div>}
          </form>
        </div>
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <h3 style={{ marginTop: 0 }}>Your documents</h3>
          {docs.length === 0 && <p style={{ color: "var(--muted)" }}>No documents yet.</p>}
          <ul className="list-clean" style={{ display: "grid", gap: 6 }}>
            {docs.map((d) => (
              <li key={d.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>
                <div style={{ fontWeight: 700 }}>{d.name}</div>
                <div><a href={d.url} target="_blank" rel="noreferrer">{d.url}</a></div>
                <div style={{ color: "var(--muted)" }}>{new Date(d.uploadedAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Video room</h3>
        <p style={{ color: "var(--muted)" }}>Open a Jitsi room for your student calls.</p>
        <VideoCall roomName={`consultant-${user.id}-room`} height={360} />
      </div>
    </div>
  );
}
