const express = require("express");
const router = express.Router();
const { createEvent, 
    getEventDetails, 
    getEventQRCode,
    getTrendingEvents,
    getEventsByUserId,
    getEventsByUser,
    getUserUpcomingEvents,
    getUserPastEvents,
    sendEventSummaryManual } = require("../controllers/createEvent");
    
const {
  acceptInvite,
  resendInvite,
  sendInvites,
  revokeInvite,
  declineInvite,
  viewInvite,
  viewMyInvites,
  getInvitedEmails,
  getAcceptedInvites,
  getDeclinedInvites,
  getInviteSummary
} = require("../controllers/inviteController");
const authenticateUser = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuth");
const upload = require('../middlewares/multer')

router.post('/create-event', authenticateUser, upload.single('ivImage'), createEvent);
router.get("/event/:eventId/details", optionalAuth, getEventDetails);
router.get('/events/trending', getTrendingEvents);
router.get("/my-events", authenticateUser, getEventsByUser);
router.get("/by-user/:userId", authenticateUser, getEventsByUserId);
router.get('/events/upcoming', authenticateUser, getUserUpcomingEvents);
router.get('/events/past', authenticateUser, getUserPastEvents); 
router.post("/send-invite/", sendInvites);
router.post('/resend-invite',  resendInvite);
router.post('/revoke-invite',  revokeInvite);
router.get("/invite/view/:token", viewInvite)
router.get("/myInvites", authenticateUser, viewMyInvites)

router.get("/:eventId/invited-emails", getInvitedEmails);
router.get("/invite/accept/:token", acceptInvite);
router.get("/invite/decline/:token", declineInvite);
router.get("/events/:eventId/qr", optionalAuth, getEventQRCode);
router.get('/event/:eventId/invites/accepted', getAcceptedInvites);
router.get('/event/:eventId/invites/declined', getDeclinedInvites);
router.get('/event/:eventId/invites/summary', getInviteSummary);
router.get('/event/:eventId/send-summary', authenticateUser, sendEventSummaryManual);



const PDFDocument = require("pdfkit");
const Invite = require("../models/inviteModel"); 
const Event = require("../models/eventModel"); 
router.get("/event/:event/invited-emails/pdf", async (req, res) => {
  try {
    const { event } = req.params;

    // Fetch the event details
    const eventDoc = await Event.findById(event).select("name");
    if (!eventDoc) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Fetch all invites directly from Invite model
    const invites = await Invite.find({ event }).select("email status").lean();

    if (!invites || invites.length === 0) {
      return res.status(404).json({ message: "No invites found for this event" });
    }

    // Create PDF document
    const doc = new PDFDocument();

    // Set headers so Postman/browser downloads file
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invited_emails_${eventDoc.name.replace(/\s+/g, "_")}.pdf`
    );

    // Pipe PDF into response
    doc.pipe(res);

    // Add title
    doc.fontSize(18).text(`Invited Guests/Emails to ${eventDoc.name}`, {
      align: "center",
    });
    doc.moveDown();

    // Add table header
    doc.fontSize(14).text("No.   Email                          Status");
    doc.moveDown(0.5);

    // List invitees with email + status
    invites.forEach((invite, index) => {
      doc.fontSize(12).text(
        `${index + 1}.   ${invite.email}    (${invite.status || "Pending"})`
      );
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Error generating invited emails PDF:", error);
    res.status(500).json({ message: "Server error", error });
  }
});









module.exports = router;
