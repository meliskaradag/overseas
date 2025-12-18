const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { getRatings, saveRatings } = require("../db");

router.use(authMiddleware);

router.get("/", (req, res) => {
  const ratings = getRatings(req.user.id);
  res.json(ratings);
});

router.put("/", (req, res) => {
  const { consultant = null, representative = null } = req.body || {};
  const updated = saveRatings(req.user.id, { consultant, representative });
  res.json(updated);
});

module.exports = router;
