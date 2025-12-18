import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import socket from "../socket";

export default function ChatWindow({ conversationId }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!conversationId) return;
      try {
        const res = await api.get(`/conversations/${conversationId}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };
    load();
  }, [conversationId]);

  useEffect(() => {
    if (!user || !token) return;
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }, [user, token]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const handleMessage = (msg) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };

    socket.emit("join", { conversationId });
    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    };
  }, [conversationId, user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !conversationId) return;

    const payload = { conversationId, senderId: user.id, text };

    try {
      if (socket.connected) {
        socket.emit("message", payload, (res) => {
          if (res?.ok && res.message) {
            setMessages((m) => (m.find((msg) => msg.id === res.message.id) ? m : [...m, res.message]));
          }
        });
      } else {
        const res = await api.post(`/conversations/${conversationId}/messages`, payload);
        setMessages((m) => [...m, res.data]);
      }
      setText("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  if (!conversationId) return <p>Select a conversation.</p>;

  return (
    <div className="chat-box">
      <div className="section-title" style={{ marginBottom: 10 }}>
        <h4 style={{ margin: 0 }}>Messages</h4>
      </div>
      <div className="chat-messages" style={{ maxHeight: 520 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{ textAlign: m.senderId === user.id ? "right" : "left" }}
          >
            <div className={`message ${m.senderId === user.id ? "me" : ""}`}>
              <div>{m.text}</div>
              <small style={{ fontSize: 10, color: "var(--muted)" }}>
                {new Date(m.createdAt).toLocaleString()}
              </small>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
