const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next(); // skip if no token

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (err) {
    // we gaz ignore errors here, because failing auth shouldn't block access entirely.
  }

  next();
};

module.exports = optionalAuth;
