const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { listAppointmentsForUser, createAppointment, updateAppointmentStatus } = require("../db");

router.use(authMiddleware);

// List appointments for current user
router.get("/", (req, res) => {
  const apps = listAppointmentsForUser(req.user.id);
  res.json(apps);
});

// Create appointment
router.post("/", (req, res) => {
  const { type, time, participantIds = [], note } = req.body;
  if (!type || !time) {
    return res.status(400).json({ message: "type and time are required" });
  }
  const participants = Array.from(new Set([...(participantIds || []), req.user.id]));
  const app = createAppointment({
    type,
    time,
    participantIds: participants,
    note,
    createdBy: req.user.id
  });

  // Auto-approve after 1 minute (demo behavior)
  setTimeout(() => {
    updateAppointmentStatus(app.id, "approved", req.user.id);
  }, 60_000);

  res.status(201).json(app);
});

// Update status
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: "status is required" });
  const updated = updateAppointmentStatus(req.params.id, status, req.user.id);
  if (!updated) return res.status(404).json({ message: "Appointment not found or forbidden" });
  if (status === "pending") {
    setTimeout(() => {
      updateAppointmentStatus(req.params.id, "approved", req.user.id);
    }, 60_000);
  }
  res.json(updated);
});

module.exports = router;
