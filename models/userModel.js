const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: { type: String },
//     subaccountCode: { type: String },
// bankInfo: {
//   accountNumber: String,
//   bankCode: String,
//   accountName: String,
// },

    blacklist:{
      type: Array,
      default:[]
    },
    provider: {
      type: String,
      enum: ["local", "google", "facebook", "apple"],
      default: "local",
    },
    providerId: String, 

    avatar: String,

    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date,

    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
);

// Hash password if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
