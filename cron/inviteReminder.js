const cron = require('node-cron');
const Invite = require('../models/inviteModel');
const sendEmail = require('../utils/sendEmail'); // Adjust path if needed

cron.schedule('0 * * * *', async () => {
  // runs every hour
  try {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const invites = await Invite.find({
      expiresAt: { $gte: now, $lte: reminderThreshold },
      reminderSent: false,
      revoked: false,
      status: { $in: ['pending', null] } // assuming you have a status field
    }).populate('event');

    for (const invite of invites) {
      const acceptLink = `https://bloomday-dev.netlify.app/invite/accept/${invite.token}`;
      const declineLink = `https://bloomday-dev.netlify.app/invite/decline/${invite.token}`;

      const eventName = invite.event?.name || 'an event';
      const eventDate = new Date(invite.event?.date).toLocaleString();

      await sendEmail({
        to: invite.email,
        subject: `⏰ Reminder: Invitation to ${eventName} is expiring soon!`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #FF9800;">⏰ Your invite to "${eventName}" is expiring soon!</h2>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p>Please respond before it expires.</p>

            <div style="margin: 20px 0;">
              <a href="${acceptLink}" style="padding: 10px 15px; background: green; color: white; text-decoration: none; border-radius: 5px;">Accept</a>
              <a href="${declineLink}" style="padding: 10px 15px; background: crimson; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline</a>
            </div>

            <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
          </div>
        `,
      });

      invite.reminderSent = true;
      await invite.save();
    }

    console.log(`[${new Date().toISOString()}] ✅ Sent ${invites.length} invite reminders.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to send invite reminders:`, err.message);
  }
});
