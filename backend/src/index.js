const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { getConversationById, createMessage } = require("./db");
const { verifySocketToken } = require("./middleware/auth");
const documentsRoutes = require("./routes/documents");
const appointmentsRoutes = require("./routes/appointments");
const preferencesRoutes = require("./routes/preferences");
const ratingsRoutes = require("./routes/ratings");
const app = express();
const authRoutes = require("./routes/auth");
const propertiesRoutes = require("./routes/properties");
const usersRoutes = require("./routes/users");
const conversationsRoutes = require("./routes/conversations");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Overseas Housing API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertiesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/ratings", ratingsRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Make io accessible in routes for broadcasting
app.set("io", io);

// Authenticate sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = verifySocketToken(token);
  if (!user) {
    return next(new Error("Unauthorized"));
  }
  socket.user = user;
  next();
});

io.on("connection", (socket) => {
  socket.on("join", ({ conversationId }) => {
    const conv = getConversationById(conversationId);
    if (!conv) {
      socket.emit("error", { message: "Conversation not found" });
      return;
    }
    if (!conv.participants.includes(socket.user.id)) {
      socket.emit("error", { message: "Not allowed to join this conversation" });
      return;
    }
    socket.join(conversationId);
    socket.emit("joined", { conversationId });
  });

  socket.on("message", ({ conversationId, text }, ack) => {
    try {
      const conv = getConversationById(conversationId);
      if (!conv) throw new Error("Conversation not found");
      if (!conv.participants.includes(socket.user.id)) {
        throw new Error("Not allowed to post to this conversation");
      }
      if (!text || !text.trim()) throw new Error("Message text is required");

      const msg = createMessage(conversationId, socket.user.id, text);
      io.to(conversationId).emit("message", msg);
      ack && ack({ ok: true, message: msg });
    } catch (err) {
      ack && ack({ ok: false, error: err.message });
      socket.emit("error", { message: err.message });
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
