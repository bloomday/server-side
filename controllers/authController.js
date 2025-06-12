const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { signupSchema, signinSchema } = require('../validators/auth');
const { sendVerificationEmail,
  sendMail
 } = require('../utils/sendEmail');

 //const sendMail = require('../utils/sendEmails');

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, provider: user.provider, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

exports.signup = async (req, res) => {
  try {
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
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000

    });

    // await sendMail({
    //   to: user.email,
    //   subject: 'Verify your email',
    //   html: `<p>Click <a href="http://localhost:3000/verify-email?token=${verificationToken}">here</a> to verify your email.</p>`,
    // });
         await sendVerificationEmail(user.email, verificationToken, 'verify');
        return res.status(201).json({ 
          message: 'Please verify your email',
          data: user });
    
  } catch (err) {
    console.error('Signup error:', err); 
    res.status(500).json({ 
      message: 'Something went wrong during signup' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });

    if (!user || user.verificationExpires < Date.now()) {
      return res.status(400).json({ message: 'Token expired or invalid' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'Email verification failed' });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified)
      return res.status(400).json({ message: 'Email is already verified' });

    const newToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = newToken;
    user.verificationExpires = Date.now() + 3600000;
    await user.save();

    await sendVerificationEmail(user.email, verificationToken, 'verify');
        return res.status(201).json({ 
          message: 'Verification email resent successfully',
          data: user });
    
  } catch (err) {
    console.error('Resend email error:', err);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
};

exports.signin = async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Signin failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body;
    const user = await User.findOne(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 3600000;
    await user.save();

    await sendVerificationEmail(user.email, resetToken, 'Reset password');
        // return res.status(201).json({ 
        //   message: 'Please verify your email',
        //   data: user });

  return res.status(201).json({ message: 'Reset link sent to your email',
    data:resetToken
   });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send reset email' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Password reset failed' });
  }
};

exports.logout = async (req, res) =>{
  try{
    const userId = req.user._id;
      const hasAuthorization = req.headers.authorization;
      if (!hasAuthorization){
          return res.status(401).json({message: "Authorization token not found"})
      }
      const token = hasAuthorization.split(" ")[1];
      const user= await User.findById(userId);
      if(!user){
          return res.status(404).json({message: "User not found"})
      }
      user.blacklist.push(token);
      await user.save();
     return res.status(200).json({message: "User logged out successfully"})
  }catch (err) {
      return res.status(500).json({
          message: err.message
      })
  }
}
