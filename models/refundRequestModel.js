// models/refundRequestModel.js

const mongoose = require('mongoose');

const refundRequestSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  email: String,
  name: String,
  reason: {
    type: String,
    default: 'No reason provided',
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'refunded', 'failed'],
    default: 'pending',
  },
  initiatedByAdmin: {
    type: Boolean,
    default: false,
  },
  initiatedAt: {
    type: Date,
    default: Date.now,
  },
  refundedAt: Date,
  failureReason: String,
}, { timestamps: true });

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
