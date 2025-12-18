const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { listAppointmentsForUser, createAppointment, updateAppointmentStatus } = require("../db");

router.use(authMiddleware);

// List appointments for current user
router.get("/", async (req, res) => {
  try {
    const apps = await listAppointmentsForUser(req.user.id);
    res.json(apps);
  } catch (err) {
    console.error("List appointments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create appointment
router.post("/", async (req, res) => {
  try {
    const { type, time, participantIds = [], note } = req.body;
    if (!type || !time) {
      return res.status(400).json({ message: "type and time are required" });
    }
    const participants = Array.from(new Set([...(participantIds || []), req.user.id]));
    const app = await createAppointment({
      type,
      time,
      participantIds: participants,
      note,
      createdBy: req.user.id
    });

    // Auto-approve after 1 minute (demo behavior)
    setTimeout(async () => {
      try {
        await updateAppointmentStatus(app.id, "approved", req.user.id);
      } catch (e) {
        console.error("Auto-approve error:", e);
      }
    }, 60_000);

    res.status(201).json(app);
  } catch (err) {
    console.error("Create appointment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const updated = await updateAppointmentStatus(req.params.id, status, req.user.id);
    if (!updated) return res.status(404).json({ message: "Appointment not found or forbidden" });
    if (status === "pending") {
      setTimeout(async () => {
        try {
          await updateAppointmentStatus(req.params.id, "approved", req.user.id);
        } catch (e) {
          console.error("Auto-approve error:", e);
        }
      }, 60_000);
    }
    res.json(updated);
  } catch (err) {
    console.error("Update appointment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
