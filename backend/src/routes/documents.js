const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { listDocumentsForUser, createDocument } = require("../db");

router.use(authMiddleware);

router.get("/", (req, res) => {
  const docs = listDocumentsForUser(req.user.id);
  res.json(docs);
});

router.post("/", (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ message: "Name and URL are required" });
  }
  const doc = createDocument({ userId: req.user.id, name, url });
  res.status(201).json(doc);
});

module.exports = router;
