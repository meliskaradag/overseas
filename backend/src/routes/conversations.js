const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { listConversationsForUser, listMessagesForConversation, createMessage, createConversation, getConversationById } = require("../db");

// All conversation routes require auth
router.use(authMiddleware);

// Conversations of a user
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;
    if (!userId) return res.status(400).json({ message: "userId is required" });
    const conversations = await listConversationsForUser(userId);
    res.json(conversations);
  } catch (err) {
    console.error("List conversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Messages of a conversation
router.get("/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conv = await getConversationById(conversationId);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!conv.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const messages = await listMessagesForConversation(conversationId);
    res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// New message
router.post("/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    const conv = await getConversationById(conversationId);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!conv.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const msg = await createMessage(conversationId, req.user.id, text);
    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("message", msg);
    }
    res.status(201).json(msg);
  } catch (err) {
    console.error("Create message error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create conversation
router.post("/", async (req, res) => {
  try {
    const { participantIds } = req.body;
    if (!participantIds || participantIds.length < 2) {
      return res.status(400).json({ message: "At least two participants are required" });
    }

    if (!participantIds.includes(req.user.id)) {
      return res.status(403).json({ message: "You must be part of the conversation" });
    }

    const conv = await createConversation(participantIds);
    res.status(201).json(conv);
  } catch (err) {
    console.error("Create conversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
