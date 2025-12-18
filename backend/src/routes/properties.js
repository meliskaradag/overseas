const express = require("express");
const router = express.Router();
const { listProperties, getPropertyById, createProperty } = require("../db");
const { authMiddleware } = require("../middleware/auth");

// All properties
router.get("/", (req, res) => {
  const {
    city,
    country,
    minPrice,
    maxPrice,
    ownerId,
    noise,
    safety,
    transit,
    neighbors,
    market,
    transitDistance,
    social,
    elevator,
    wifi,
    washer
  } = req.query;
  const properties = listProperties({
    city,
    country,
    minPrice,
    maxPrice,
    ownerId,
    noise,
    safety,
    transit,
    neighbors,
    market,
    transitDistance,
    social,
    elevator,
    wifi,
    washer
  });
  res.json(properties);
});

// Single property
router.get("/:id", (req, res) => {
  const prop = getPropertyById(req.params.id);
  if (!prop) return res.status(404).json({ message: "Not found" });
  res.json(prop);
});

// Create property (owner only)
router.post("/", authMiddleware, (req, res) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Only owners can create listings" });
  }

  const { title, city, country, price, type, description, images, lat, lng, hasRepresentative, quality, features } = req.body;

  if (!title || !city || !country || !price || !type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const prop = createProperty({
    title,
    city,
    country,
    price,
    type,
    description,
    images,
    lat: lat !== undefined ? Number(lat) : null,
    lng: lng !== undefined ? Number(lng) : null,
    hasRepresentative: Boolean(hasRepresentative),
    quality,
    features,
    ownerId: req.user.id,
    ownerName: req.user.name || "",
    ownerEmail: req.user.email || ""
  });

  res.status(201).json(prop);
});

module.exports = router;
