const express = require("express");
const router = express.Router();
const { createEvent, 
    getEventDetails, 
    getEventQRCode,
    getTrendingEvents,
    getEventsByUserId,
    getEventsByUser,
    getUserUpcomingEvents,
    getUserPastEvents } = require("../controllers/createEvent");
const {
  acceptInvite,
  resendInvite,
  sendInvites,
  revokeInvite,
  declineInvite,
  viewInvite
} = require("../controllers/inviteController");
const authenticateUser = require("../middlewares/authMiddleware");
const upload = require('../middlewares/multer')
// routes/event.js
//router.post("/create", authenticateUser, createEvent);
router.post('/create-event', authenticateUser, upload.single('ivImage'), createEvent);
router.get("/event/:eventId/details", getEventDetails);
router.get('/events/trending', getTrendingEvents);
router.get("/my-events", authenticateUser, getEventsByUser);
router.get("/by-user/:userId", authenticateUser, getEventsByUserId);
router.get('/events/upcoming', authenticateUser, getUserUpcomingEvents);
router.get('/events/past', authenticateUser, getUserPastEvents);

router.post("/send-invite/", sendInvites);
router.post('/resend-invite',  resendInvite);
router.post('/revoke-invite',  revokeInvite);
router.get("/invite/view/:token", viewInvite)

router.get("/invite/accept/:token", acceptInvite);
router.get("/invite/decline/:token", declineInvite);
router.get("/events/:eventId/qr", getEventQRCode);

module.exports = router;
