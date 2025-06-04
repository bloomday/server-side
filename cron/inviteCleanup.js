const cron = require('node-cron');
const Invite = require('../models/inviteModel');

// Shared cleanup function
const runInviteCleanup = async (label = 'Scheduled') => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Start of yesterday
    
    const now = new Date();
    
    const expiredInvites = await Invite.find({
      expiresAt: { $gte: yesterday, $lt: now },
      revoked: false
    });

    for (const invite of expiredInvites) {
      invite.revoked = true;
      await invite.save();
    }

    console.log(`[${new Date().toISOString()}] ✅ ${label} invite cleanup done. Revoked ${expiredInvites.length} invites.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ ${label} invite cleanup failed:`, err.message);
  }
};

// Run cleanup once on server start
runInviteCleanup('Startup');

// Schedule daily cleanup at midnight
cron.schedule('0 0 * * *', () => runInviteCleanup('Scheduled'));

module.exports = runInviteCleanup;
