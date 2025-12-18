import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import ChatWindow from "../components/ChatWindow";
import VideoCall from "../components/VideoCall";

const parseNote = (note) => {
  if (!note) return {};
  try {
    return JSON.parse(note);
  } catch (err) {
    return {};
  }
};

export default function RepresentativeDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  const repAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.type === "representative" && a.participantIds.includes(user.id))
        .map((a) => ({ ...a, meta: parseNote(a.note) })),
    [appointments, user.id]
  );

  useEffect(() => {
    const loadAppointments = async () => {
      const res = await api.get("/appointments");
      setAppointments(res.data);
    };
    const loadConvs = async () => {
      const res = await api.get("/conversations");
      setConversations(res.data);
      if (res.data[0]) setSelectedConversationId(res.data[0].id);
    };
    loadAppointments();
    loadConvs();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await api.patch(`/appointments/${id}/status`, { status });
      setAppointments((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      setStatusMsg("Status updated");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || "Status update failed");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  return (
    <div className="main-content">
      <h1>Representative console</h1>
      <p style={{ color: "var(--muted)" }}>Hi {user.name}</p>

      <div className="grid-two" style={{ gap: 16, marginTop: 10, alignItems: "start" }}>
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <h3 style={{ marginTop: 0 }}>Your live tours</h3>
          {statusMsg && <div style={{ color: "var(--muted)" }}>{statusMsg}</div>}
          <ul className="list-clean" style={{ display: "grid", gap: 8 }}>
            {repAppointments.length === 0 && <li style={{ color: "var(--muted)" }}>No assigned tours yet.</li>}
            {repAppointments.map((a) => (
              <li
                key={a.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  background: a.status === "approved" ? "linear-gradient(135deg, #e8fff4, #f6fffa)" : "#f8fafc"
                }}
              >
                <div style={{ fontWeight: 700 }}>{a.meta.propertyTitle || "Listing"}</div>
                <div style={{ color: "var(--muted)" }}>{a.time}</div>
                <div style={{ color: "var(--muted)" }}>Status: {a.status}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary" onClick={() => updateStatus(a.id, "approved")}>
                    Approve
                  </button>
                  <button className="btn btn-ghost" onClick={() => updateStatus(a.id, "declined")}>
                    Decline
                  </button>
                  <button className="btn btn-primary" onClick={() => updateStatus(a.id, "completed")}>
                    Complete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ display: "grid", gap: 10 }}>
          <h3 style={{ marginTop: 0 }}>Video room</h3>
          <p style={{ color: "var(--muted)" }}>Open a Jitsi room for your next tour.</p>
          <VideoCall roomName={`representative-${user.id}-room`} height={320} />
        </div>
      </div>

      <div className="grid-two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Conversations</h3>
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
            {conversations.length === 0 && <li style={{ color: "var(--muted)" }}>No conversations yet.</li>}
          </ul>
        </div>
        <div>
          <ChatWindow conversationId={selectedConversationId} />
        </div>
      </div>
    </div>
  );
}
