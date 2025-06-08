const router = require('express').Router();
const passport = require('passport');

const authenticate = require('../middlewares/authMiddleware');

const authController = require('../controllers/authController');

// Traditional auth
router.post('/signup', authController.signup); 
router.post('/signin', authController.signin);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});


// Google
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    const { user } = req.user;
  
    // Redirect to frontend with the user's name as a query parameter
    return res.redirect(`http://localhost:8080/login.html?name=${encodeURIComponent(user.name)}`);
  });
  


// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
//   res.send('Logged in with Google');
// });

// Facebook
router.get('/facebook', passport.authenticate('facebook'));
router.get('/auth/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
    const { user, token } = req.user;
    res.json({ token, user });
  });
  

// router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
//   res.send('Logged in with Facebook');
// });


//Apple
router.get('/auth/apple', passport.authenticate('apple', { session: false }));

router.post('/auth/apple/callback', passport.authenticate('apple', { session: false }), (req, res) => {
  const { user, token } = req.user;
  res.json({ token, user });
});


module.exports = router;
