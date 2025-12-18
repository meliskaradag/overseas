const express = require("express");
const router = express.Router();
const { listUsersByRole } = require("../db");

// All consultants
router.get("/consultants", async (req, res) => {
  try {
    const users = await listUsersByRole("consultant");
    res.json(users);
  } catch (err) {
    console.error("List consultants error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// All representatives
router.get("/representatives", async (req, res) => {
  try {
    const users = await listUsersByRole("representative");
    res.json(users);
  } catch (err) {
    console.error("List representatives error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
