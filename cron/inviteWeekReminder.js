const cron = require('node-cron');
const Invite = require('../models/inviteModel');
const { sendEmail } = require('../utils/sendEmail');

// Helper to send reminder and update flags
const sendReminder = async (invites, type) => {
  for (const invite of invites) {
    const eventName = invite.event?.name || 'an event';
    const eventDate = new Date(invite.event?.date).toLocaleString();

    let subject = '';
    let messageHeader = '';

    if (type === 'twoWeeks') {
      subject = `⏳ 2 Weeks Left: ${eventName} is coming soon!`;
      messageHeader = `⏳ Reminder: "${eventName}" is in 2 weeks!`;
    } else if (type === 'oneWeek') {
      subject = `📅 1 Week Left: Don't Miss ${eventName}`;
      messageHeader = `📅 Reminder: "${eventName}" is just 1 week away!`;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #5C67F2;">${messageHeader}</h2>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p>This is a reminder for the event you've accepted. We look forward to seeing you!</p>
        <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
      </div>
    `;

    await sendEmail({
      to: invite.email,
      subject,
      html,
    });

    // Set reminder flag
    if (type === 'twoWeeks') invite.reminderTwoWeeksSent = true;
    if (type === 'oneWeek') invite.reminderOneWeekSent = true;

    await invite.save();
  }
};

// Main handler to find invites and send reminders
const runEventReminders = async () => {
  try {
    const now = new Date();

    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(now.getDate() + 14);

    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);

    // 2-week reminders — only for accepted users
    const twoWeekInvites = await Invite.find({
      reminderTwoWeeksSent: false,
      revoked: false,
      status: 'accepted',
    }).populate({
      path: 'event',
      match: {
        date: {
          $gte: new Date(twoWeeksFromNow.setHours(0, 0, 0, 0)),
          $lte: new Date(twoWeeksFromNow.setHours(23, 59, 59, 999)),
        },
      },
    });

    const filteredTwoWeek = twoWeekInvites.filter(invite => invite.event);
    await sendReminder(filteredTwoWeek, 'twoWeeks');

    // 1-week reminders — only for accepted users
    const oneWeekInvites = await Invite.find({
      reminderOneWeekSent: false,
      revoked: false,
      status: 'accepted',
    }).populate({
      path: 'event',
      match: {
        date: {
          $gte: new Date(oneWeekFromNow.setHours(0, 0, 0, 0)),
          $lte: new Date(oneWeekFromNow.setHours(23, 59, 59, 999)),
        },
      },
    });

    const filteredOneWeek = oneWeekInvites.filter(invite => invite.event);
    await sendReminder(filteredOneWeek, 'oneWeek');

    console.log(`[${new Date().toISOString()}] ✅ Event reminders sent.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Reminder error: ${err.message}`);
  }
};

// Schedule every day at 9am
cron.schedule('0 9 * * *', runEventReminders);

// Run once on startup
runEventReminders();

module.exports = runEventReminders;




// const cron = require('node-cron');
// const Invite = require('../models/inviteModel');
// const { sendEmail } = require('../utils/sendEmail');

// // Helper to send reminder and update flags
// const sendReminder = async (invites, type) => {
//   for (const invite of invites) {
//     const acceptLink = `https://bloomday-dev.netlify.app/invite/accept/${invite.token}`;
//     const declineLink = `https://bloomday-dev.netlify.app/invite/decline/${invite.token}`;

//     const eventName = invite.event?.name || 'an event';
//     const eventDate = new Date(invite.event?.date).toLocaleString();

//     let subject = '';
//     let messageHeader = '';

//     if (type === 'twoWeeks') {
//       subject = `⏳ 2 Weeks Left: ${eventName} is coming soon!`;
//       messageHeader = `⏳ You're invited to "${eventName}" in 2 weeks!`;
//     } else if (type === 'oneWeek') {
//       subject = `📅 1 Week Left: Don't Miss ${eventName}`;
//       messageHeader = `📅 "${eventName}" is just 1 week away!`;
//     }

//     // Build HTML content
//     let html = `
//       <div style="font-family: Arial, sans-serif; padding: 20px;">
//         <h2 style="color: #5C67F2;">${messageHeader}</h2>
//         <p><strong>Date:</strong> ${eventDate}</p>
//     `;

//     // If user has not responded yet, show Accept/Decline
//     if (!invite.status || invite.status === 'pending') {
//       html += `
//         <p>Kindly respond to your invitation below:</p>
//         <div style="margin: 20px 0;">
//           <a href="${acceptLink}" style="padding: 10px 15px; background: green; color: white; text-decoration: none; border-radius: 5px;">Accept</a>
//           <a href="${declineLink}" style="padding: 10px 15px; background: crimson; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline</a>
//         </div>
//       `;
//     } else {
//       html += `<p>This is a reminder for the event you've already responded to. We look forward to seeing you there!</p>`;
//     }

//     html += `<p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p></div>`;

//     await sendEmail({
//       to: invite.email,
//       subject,
//       html,
//     });

//     // Set reminder flag
//     if (type === 'twoWeeks') invite.reminderTwoWeeksSent = true;
//     if (type === 'oneWeek') invite.reminderOneWeekSent = true;

//     await invite.save();
//   }
// };

// // Main handler to find invites and send reminders
// const runEventReminders = async () => {
//   try {
//     const now = new Date();

//     const twoWeeksFromNow = new Date(now);
//     twoWeeksFromNow.setDate(now.getDate() + 14);

//     const oneWeekFromNow = new Date(now);
//     oneWeekFromNow.setDate(now.getDate() + 7);

//     // 2-week reminders
//     const twoWeekInvites = await Invite.find({
//       reminderTwoWeeksSent: false,
//       revoked: false,
//     }).populate({
//       path: 'event',
//       match: {
//         date: {
//           $gte: new Date(twoWeeksFromNow.setHours(0, 0, 0, 0)),
//           $lte: new Date(twoWeeksFromNow.setHours(23, 59, 59, 999)),
//         },
//       },
//     });

//     const filteredTwoWeek = twoWeekInvites.filter(invite => invite.event);
//     await sendReminder(filteredTwoWeek, 'twoWeeks');

//     // 1-week reminders
//     const oneWeekInvites = await Invite.find({
//       reminderOneWeekSent: false,
//       revoked: false,
//     }).populate({
//       path: 'event',
//       match: {
//         date: {
//           $gte: new Date(oneWeekFromNow.setHours(0, 0, 0, 0)),
//           $lte: new Date(oneWeekFromNow.setHours(23, 59, 59, 999)),
//         },
//       },
//     });

//     const filteredOneWeek = oneWeekInvites.filter(invite => invite.event);
//     await sendReminder(filteredOneWeek, 'oneWeek');

//     console.log(`[${new Date().toISOString()}] ✅ Event reminders sent.`);
//   } catch (err) {
//     console.error(`[${new Date().toISOString()}] ❌ Reminder error: ${err.message}`);
//   }
// };

// // Schedule every day at 9am
// cron.schedule('0 9 * * *', runEventReminders);

// // Run immediately on startup
// runEventReminders();

// module.exports = runEventReminders;
