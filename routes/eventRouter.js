const express = require("express");
const router = express.Router();
const { createEvent, 
    getEventDetails, 
    getEventQRCode } = require("../controllers/createEvent");
const {
  acceptInvite,
  resendInvite,
  sendInvites,
  revokeInvite,
  declineInvite,
} = require("../controllers/inviteController");
const authenticateUser = require("../middlewares/authMiddleware");
const upload = require('../middlewares/multer')
// routes/event.js
//router.post("/create", authenticateUser, createEvent);
router.post('/create-event', authenticateUser, upload.single('ivImage'), createEvent);
router.get("/event/:eventId/details", getEventDetails);
router.post("/send-invite/", sendInvites);
router.post('/resend-invite',  resendInvite);
router.post('/revoke-invite',  revokeInvite);

router.get("/invite/accept/:token", acceptInvite);
router.get("/invite/decline/:token", declineInvite);
router.get("/events/:eventId/qr", getEventQRCode);

module.exports = router;
