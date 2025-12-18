const express = require("express");
const router = express.Router();
const { listProperties, getPropertyById, createProperty } = require("../db");
const { authMiddleware } = require("../middleware/auth");

// All properties
router.get("/", async (req, res) => {
  try {
    const {
      city, country, minPrice, maxPrice, ownerId,
      noise, safety, transit, neighbors, market,
      transitDistance, social, elevator, wifi, washer
    } = req.query;
    const properties = await listProperties({
      city, country, minPrice, maxPrice, ownerId,
      noise, safety, transit, neighbors, market,
      transitDistance, social, elevator, wifi, washer
    });
    res.json(properties);
  } catch (err) {
    console.error("List properties error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Single property
router.get("/:id", async (req, res) => {
  try {
    const prop = await getPropertyById(req.params.id);
    if (!prop) return res.status(404).json({ message: "Not found" });
    res.json(prop);
  } catch (err) {
    console.error("Get property error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create property (owner only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owners can create listings" });
    }

    const { title, city, country, price, type, description, images, lat, lng, hasRepresentative, quality, features } = req.body;

    if (!title || !city || !country || !price || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prop = await createProperty({
      title, city, country, price, type, description, images,
      lat: lat !== undefined ? Number(lat) : null,
      lng: lng !== undefined ? Number(lng) : null,
      hasRepresentative: Boolean(hasRepresentative),
      quality, features,
      ownerId: req.user.id,
      ownerName: req.user.name || "",
      ownerEmail: req.user.email || ""
    });

    res.status(201).json(prop);
  } catch (err) {
    console.error("Create property error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
