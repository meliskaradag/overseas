const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { getPreferences, savePreferences, deletePreferences } = require("../db");

router.use(authMiddleware);

router.get("/", (req, res) => {
  const prefs = getPreferences(req.user.id);
  res.json(prefs ? prefs.data : {});
});

router.put("/", (req, res) => {
  const data = req.body || {};
  const saved = savePreferences(req.user.id, data);
  res.json(saved.data);
});

router.delete("/", (req, res) => {
  deletePreferences(req.user.id);
  res.status(204).send();
});

module.exports = router;
