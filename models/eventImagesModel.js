const mongoose = require('mongoose');

const eventImageSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  uploaderNameOrEmail: String, 
  imageUrl: String,
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EventImage', eventImageSchema);
