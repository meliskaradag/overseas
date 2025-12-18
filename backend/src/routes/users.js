const express = require("express");
const router = express.Router();
const { listUsersByRole } = require("../db");

// All consultants
router.get("/consultants", (req, res) => {
  res.json(listUsersByRole("consultant"));
});

// All representatives
router.get("/representatives", (req, res) => {
  res.json(listUsersByRole("representative"));
});

module.exports = router;
