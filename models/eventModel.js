const mongoose = require("mongoose");
const slugify = require("slugify");

const eventSchema = new mongoose.Schema({
  name: String,
  description: String,
  date: Date,
  location: String,
  hosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  slug: {
    type: String,
    unique: true,
    required: true,
  },
  eventUrl: { type: String, unique: true },
  qrCode: { type: String }, // base64 image

  allowCrowdfunding: { type: Boolean, default: false },

  invitees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invite" }],

  gallery: [
    {
      url: String,
      uploadedBy: String, // guest name or user name
      email: String, // guest email or user email
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  ivImage: { type: String },
  contributions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      name: String, // for guest
      email: String, // for guest
      amount:  { type: Number, required: true },
      message: String,
      paidAt:  { type: Date, default: Date.now },
    },
  ],
  views: { type: Number, default: 0 },
viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
guestViews: [String], // optional, for guest tokens

  summaryReportSent: {
    type: Boolean,
    default: false,
  }  
},
{ timestamps: true });

const { v4: uuidv4 } = require("uuid");

eventSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name || uuidv4(), { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
