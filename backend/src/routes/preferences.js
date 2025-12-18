const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { getPreferences, savePreferences, deletePreferences } = require("../db");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const prefs = await getPreferences(req.user.id);
    res.json(prefs ? prefs.data : {});
  } catch (err) {
    console.error("Get preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const data = req.body || {};
    const saved = await savePreferences(req.user.id, data);
    res.json(saved.data);
  } catch (err) {
    console.error("Save preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/", async (req, res) => {
  try {
    await deletePreferences(req.user.id);
    res.status(204).send();
  } catch (err) {
    console.error("Delete preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
