const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { getRatings, saveRatings } = require("../db");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const ratings = await getRatings(req.user.id);
    res.json(ratings);
  } catch (err) {
    console.error("Get ratings error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const { consultant = null, representative = null } = req.body || {};
    const updated = await saveRatings(req.user.id, { consultant, representative });
    res.json(updated);
  } catch (err) {
    console.error("Save ratings error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
