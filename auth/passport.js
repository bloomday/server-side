const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/userModel');
require('dotenv').config();
const AppleStrategy = require('passport-apple');


// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      provider: user.provider,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};


passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
   callbackURL: "http://localhost:3000/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await User.findOne({ providerId: profile.id, provider: 'google' });

    if (existingUser) {
      // Already signed up → log in
      return done(null, { user: existingUser, });
    }

    // First time → Sign up
    const newUser = await User.create({
      providerId: profile.id,
      provider: 'google',
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value,
    });


    //const token = generateToken(user);
    done(null, {user: newUser,});
  } catch (err) {
    done(err, null);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FB_CLIENT_ID,
  clientSecret: process.env.FB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  profileFields: ['id', 'displayName', 'photos', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ providerId: profile.id, provider: 'facebook' });
    if (!user) {
      user = await User.create({
        providerId: profile.id,
        provider: 'facebook',
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        photo: profile.photos?.[0]?.value,
      });
    }
    const token = generateToken(user);
    done(null, {user, token });
  } catch (err) {
    done(err, null);
  }
}));






passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID,
  teamID: process.env.APPLE_TEAM_ID,
  keyID: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  callbackURL: "http://localhost:3000/auth/apple/callback",
  scope: ['name', 'email'],
}, async (accessToken, refreshToken, idToken, profile, done) => {
  try {
    const { sub: appleId, email } = idToken;

    let user = await User.findOne({ providerId: appleId, provider: 'apple' });

    if (!user) {
      user = await User.create({
        providerId: appleId,
        provider: 'apple',
        name: profile?.name?.firstName || 'Apple User',
        email: email || `${appleId}@privaterelay.appleid.com`, // fallback email
      });
    }

    const token = generateToken(user);
    done(null, { user, token });
  } catch (err) {
    done(err, null);
  }
}));


