const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { getUserByEmail, createUser } = require("../db");
const { signToken } = require("../middleware/auth");

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email, name: user.name });

    res.json({ user, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register (demo only)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exists = await getUserByEmail(email);
    if (exists) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const newUser = await createUser({ name, email, password, role });
    const token = signToken({ id: newUser.id, role: newUser.role, email: newUser.email, name: newUser.name });

    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
