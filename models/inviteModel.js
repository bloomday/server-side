const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  email: String,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  
  token: String, // unique token for the invite link
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  respondedAt: Date,
});

module.exports = mongoose.model('Invite', inviteSchema);
