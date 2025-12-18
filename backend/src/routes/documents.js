const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { listDocumentsForUser, createDocument } = require("../db");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const docs = await listDocumentsForUser(req.user.id);
    res.json(docs);
  } catch (err) {
    console.error("List documents error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: "Name and URL are required" });
    }
    const doc = await createDocument({ userId: req.user.id, name, url });
    res.status(201).json(doc);
  } catch (err) {
    console.error("Create document error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
