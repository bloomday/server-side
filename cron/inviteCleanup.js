const cron = require('node-cron');
const Invite = require('../models/inviteModel');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();

    const expiredInvites = await Invite.find({
      expiresAt: { $lt: now },
      revoked: false
    });

    for (const invite of expiredInvites) {
      invite.revoked = true;
      await invite.save();
    }

    console.log(`[${new Date().toISOString()}] ✅ Invite cleanup done. Revoked ${expiredInvites.length} invites.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Invite cleanup failed:`, err.message);
  }
});
