const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { listConversationsForUser, listMessagesForConversation, createMessage, createConversation, getConversationById } = require("../db");

// All conversation routes require auth
router.use(authMiddleware);

// Conversations of a user
router.get("/", (req, res) => {
  const userId = req.query.userId || req.user?.id;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  res.json(listConversationsForUser(userId));
});

// Messages of a conversation
router.get("/:conversationId/messages", (req, res) => {
  const { conversationId } = req.params;
  const conv = getConversationById(conversationId);
  if (!conv) return res.status(404).json({ message: "Conversation not found" });
  if (!conv.participants.includes(req.user.id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.json(listMessagesForConversation(conversationId));
});

// New message
router.post("/:conversationId/messages", (req, res) => {
  const { conversationId } = req.params;
  const { text } = req.body;

  const conv = getConversationById(conversationId);
  if (!conv) return res.status(404).json({ message: "Conversation not found" });
  if (!conv.participants.includes(req.user.id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const msg = createMessage(conversationId, req.user.id, text);
  const io = req.app.get("io");
  if (io) {
    io.to(conversationId).emit("message", msg);
  }
  res.status(201).json(msg);
});

// Create conversation
router.post("/", (req, res) => {
  const { participantIds } = req.body;
  if (!participantIds || participantIds.length < 2) {
    return res
      .status(400)
      .json({ message: "At least two participants are required" });
  }

  if (!participantIds.includes(req.user.id)) {
    return res.status(403).json({ message: "You must be part of the conversation" });
  }

  const conv = createConversation(participantIds);
  res.status(201).json(conv);
});

module.exports = router;
