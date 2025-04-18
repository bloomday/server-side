const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { signupSchema, signinSchema } = require('../validators/auth');
const { sendVerificationEmail } = require('../utils/sendEmail');

const generateToken = (user) =>
  jwt.sign({ id: user._id, provider: user.provider, email: user.email },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

exports.signup = async (req, res) => {
  const { error } = signupSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name,
    email,
    password,
    provider: 'local',
    verificationToken,
    verificationExpires: Date.now() + 3600000, // 1 hour
  });

  await sendVerificationEmail(user.email, verificationToken, 'verify');
  res.status(201).json({ message: 'Check your email to verify your account' });
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({ verificationToken: token });

  if (!user || user.verificationExpires < Date.now())
    return res.status(400).json({ message: 'Token expired or invalid' });

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully' });
};

exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.body;
  
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
  
    if (user.isVerified)
      return res.status(400).json({ message: 'Email is already verified' });
  
    const newToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = newToken;
    user.verificationExpires = Date.now() + 3600000; // 1 hour
    await user.save();
  
    await sendVerificationEmail(user.email, newToken, 'verify');
    res.json({ message: 'Verification email resent successfully' });
  };
  

exports.signin = async (req, res) => {
  const { error } = signinSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;
  const user = await User.findOne({ email, provider: 'local' });
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  if (!user.isVerified)
    return res.status(403).json({ message: 'Please verify your email first' });

  const token = generateToken(user);
  res.json({ user, token });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email, provider: 'local' });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetToken = resetToken;
  user.resetTokenExpires = Date.now() + 3600000;
  await user.save();

  await sendVerificationEmail(user.email, resetToken, 'reset');
  res.json({ message: 'Reset link sent to your email' });
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully' });
};
