// routes/admin.js
const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const Event = require('../models/eventModel');

router.get('/contributions/:eventId', isAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('contributions.user', 'name email')
      .lean();

    const total = event.contributions.reduce((sum, c) => sum + c.amount, 0);

    res.json({
      eventTitle: event.title,
      totalContributions: total,
      contributions: event.contributions,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
