const cron = require('node-cron');
const Invite = require('../models/inviteModel');
const Event = require('../models/eventModel');
const { sendEmail } = require('../utils/sendEmail');
const generatePDFBuffer = require('../utils/generatePDF');

const sendFinalReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // 🎯 FINAL REMINDERS for today's events
    const invites = await Invite.find({
      finalReminderSent: false,
      revoked: false,
      status: 'accepted',
    }).populate({
      path: 'event',
      match: {
        date: { $gte: today, $lte: endOfToday },
      },
    });

    const filteredInvites = invites.filter(inv => inv.event);

    for (const invite of filteredInvites) {
      const eventName = invite.event.name;
      const eventDate = new Date(invite.event.date).toLocaleString();

      const html = `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #007BFF;">🎉 Reminder: "${eventName}" is Today!</h2>
          <p><strong>Date:</strong> ${eventDate}</p>
          <p>We're excited to have you join us today. See you there! 🌟</p>
          <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
        </div>
      `;

      await sendEmail({
        to: invite.email,
        subject: `🎉 Reminder: ${eventName} is Today!`,
        html,
      });

      invite.finalReminderSent = true;
      await invite.save();
    }

    console.log(`[${new Date().toISOString()}] ✅ Sent ${filteredInvites.length} final reminders`);

    // 📨 SUMMARY REPORT for events from the LAST 3 DAYS that haven't been processed yet
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentEvents = await Event.find({
      date: { $gte: threeDaysAgo, $lte: endOfToday },
      summaryReportSent: { $ne: true }, // Only events that haven't been sent yet
    })
      .populate('hosts', 'name email')
      .populate('contributions.user', 'name email');

    for (const event of recentEvents) {
      const invites = await Invite.find({ event: event._id });

      const accepted = invites.filter(i => i.status === 'accepted').map(i => i.email);
      const declined = invites.filter(i => i.status === 'declined').map(i => i.email);
      const pending = invites.filter(i => !i.status || i.status === 'pending').map(i => i.email);

      const totalAmount = event.contributions.reduce((sum, c) => sum + c.amount, 0);
      const contributors = event.contributions.map(c => `
        <li>${c.user?.name || 'Anonymous'} (${c.user?.email || 'N/A'}): ₦${c.amount}</li>
      `).join('');

      const hostEmails = event.hosts.map(h => h.email);

      const html = `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #333; background: #fff; border-radius: 10px; border: 1px solid #ccc;">
          <header style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5C67F2; margin: 0;">Bloomday Event Summary</h1>
            <p style="font-size: 1rem; color: #888;">Final report for <strong>${event.name}</strong></p>
          </header>

          <section style="margin-bottom: 25px;">
            <h2 style="color: #444;">📅 Event Details</h2>
            <p><strong>Name:</strong> ${event.name}</p>
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
            <p><strong>Total Views:</strong> ${event.views}</p>
            <p><strong>Gallery Uploads:</strong> ${event.gallery?.length || 0}</p>
          </section>

          <section style="margin-bottom: 25px;">
            <h2 style="color: #444;">🎟️ RSVP Summary</h2>
            <ul style="line-height: 1.6; list-style-type: none; padding-left: 0;">
              <li>✅ <strong>Accepted:</strong> ${accepted.length}</li>
              <li>❌ <strong>Declined:</strong> ${declined.length}</li>
              <li>⏳ <strong>Pending:</strong> ${pending.length}</li>
              <li>📨 <strong>Total Invited:</strong> ${accepted.length + declined.length + pending.length}</li>
            </ul>
          </section>

          <section style="margin-bottom: 25px;">
            <h2 style="color: #444;">💸 Contributions</h2>
            <p><strong>Total Raised:</strong> ₦${totalAmount}</p>
            <ul style="line-height: 1.6; padding-left: 20px;">
              ${contributors || '<li>No contributions yet.</li>'}
            </ul>
          </section>

          <section>
            <h2 style="color: #444;">📧 RSVP Emails</h2>
            <div style="font-size: 0.95rem; margin-bottom: 15px;">
              <strong>✅ Accepted:</strong><br>${accepted.join(', ') || 'None'}
            </div>
            <div style="font-size: 0.95rem; margin-bottom: 15px;">
              <strong>❌ Declined:</strong><br>${declined.join(', ') || 'None'}
            </div>
            <div style="font-size: 0.95rem;">
              <strong>⏳ Pending:</strong><br>${pending.join(', ') || 'None'}
            </div>
          </section>

          <footer style="margin-top: 40px; text-align: center; font-size: 0.85rem; color: #999;">
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p>Generated automatically by <strong>Bloomday</strong></p>
          </footer>
        </div>
      `;

      const pdfBuffer = await generatePDFBuffer(html);

      for (const hostEmail of hostEmails) {
        await sendEmail({
          to: hostEmail,
          subject: `📊 Final Summary for ${event.name}`,
          html,
          attachments: [{
            filename: `${event.slug}-summary.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });
      }

      event.summaryReportSent = true;
      await event.save();
    }

    console.log(`[${new Date().toISOString()}] ✅ Sent summary reports for ${recentEvents.length} events`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Final reminder error:`, err.message);
  }
};

// Run daily at 7:30 AM
cron.schedule('30 7 * * *', sendFinalReminders);

// Run once on startup (optional)
sendFinalReminders();

module.exports = sendFinalReminders;













// const cron = require('node-cron');
// const Invite = require('../models/inviteModel');
// const Event = require('../models/eventModel');
// const { sendEmail } = require('../utils/sendEmail');
// const generatePDFBuffer = require('../utils/generatePDF');

// const sendFinalReminders = async () => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const tomorrow = new Date(today);
//     tomorrow.setHours(23, 59, 59, 999);

//     // 🎯 Final Reminder to Accepted Invitees ONLY
//     const invites = await Invite.find({
//       finalReminderSent: false,
//       revoked: false,
//       status: 'accepted',
//     }).populate({
//       path: 'event',
//       match: {
//         date: { $gte: today, $lte: tomorrow },
//       },
//     });

//     const filteredInvites = invites.filter(inv => inv.event);

//     for (const invite of filteredInvites) {
//       const eventName = invite.event.name;
//       const eventDate = new Date(invite.event.date).toLocaleString();

//       const html = `
//         <div style="font-family: Arial, sans-serif;">
//           <h2 style="color: #007BFF;">🎉 Reminder: "${eventName}" is Today!</h2>
//           <p><strong>Date:</strong> ${eventDate}</p>
//           <p>We're excited to have you join us today. See you there! 🌟</p>
//           <p style="font-size: 0.9em; color: gray;">Sent from Bloomday</p>
//         </div>
//       `;

//       await sendEmail({
//         to: invite.email,
//         subject: `🎉 Reminder: ${eventName} is Today!`,
//         html,
//       });

//       invite.finalReminderSent = true;
//       await invite.save();
//     }

//     console.log(`[${new Date().toISOString()}] ✅ Sent ${filteredInvites.length} final reminders`);

//     // 📨 Host Summary Report with Contributions + PDF
//     const eventsToday = await Event.find({
//       date: { $gte: today, $lte: tomorrow },
//     })
//       .populate('hosts', 'name email')
//       .populate('contributions.user', 'name email');

//     for (const event of eventsToday) {
//       const invites = await Invite.find({ event: event._id });

//       const accepted = invites.filter(i => i.status === 'accepted').map(i => i.email);
//       const declined = invites.filter(i => i.status === 'declined').map(i => i.email);
//       const pending = invites.filter(i => !i.status || i.status === 'pending').map(i => i.email);

//       const totalAmount = event.contributions.reduce((sum, c) => sum + c.amount, 0);
//       const contributors = event.contributions.map(c => `
//         <li>${c.user?.name || 'Anonymous'} (${c.user?.email || 'N/A'}): ₦${c.amount}</li>
//       `).join('');

//       const hostEmails = event.hosts.map(h => h.email);

//       const html = `
//         <div style="font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #333; background: #fff; border-radius: 10px; border: 1px solid #ccc;">
//           <header style="text-align: center; margin-bottom: 30px;">
//             <h1 style="color: #5C67F2; margin: 0;">Bloomday Event Summary</h1>
//             <p style="font-size: 1rem; color: #888;">Final report for <strong>${event.name}</strong></p>
//           </header>

//           <section style="margin-bottom: 25px;">
//             <h2 style="color: #444;">📅 Event Details</h2>
//             <p><strong>Name:</strong> ${event.name}</p>
//             <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
//             <p><strong>Total Views:</strong> ${event.views}</p>
//             <p><strong>Gallery Uploads:</strong> ${event.gallery?.length || 0}</p>
//           </section>

//           <section style="margin-bottom: 25px;">
//             <h2 style="color: #444;">🎟️ RSVP Summary</h2>
//             <ul style="line-height: 1.6; list-style-type: none; padding-left: 0;">
//               <li>✅ <strong>Accepted:</strong> ${accepted.length}</li>
//               <li>❌ <strong>Declined:</strong> ${declined.length}</li>
//               <li>⏳ <strong>Pending:</strong> ${pending.length}</li>
//               <li>📨 <strong>Total Invited:</strong> ${accepted.length + declined.length + pending.length}</li>
//             </ul>
//           </section>

//           <section style="margin-bottom: 25px;">
//             <h2 style="color: #444;">💸 Contributions</h2>
//             <p><strong>Total Raised:</strong> ₦${totalAmount}</p>
//             <ul style="line-height: 1.6; padding-left: 20px;">
//               ${contributors || '<li>No contributions yet.</li>'}
//             </ul>
//           </section>

//           <section>
//             <h2 style="color: #444;">📧 RSVP Emails</h2>
//             <div style="font-size: 0.95rem; margin-bottom: 15px;">
//               <strong>✅ Accepted:</strong><br>${accepted.join(', ') || 'None'}
//             </div>
//             <div style="font-size: 0.95rem; margin-bottom: 15px;">
//               <strong>❌ Declined:</strong><br>${declined.join(', ') || 'None'}
//             </div>
//             <div style="font-size: 0.95rem;">
//               <strong>⏳ Pending:</strong><br>${pending.join(', ') || 'None'}
//             </div>
//           </section>

//           <footer style="margin-top: 40px; text-align: center; font-size: 0.85rem; color: #999;">
//             <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
//             <p>Generated automatically by <strong>Bloomday</strong></p>
//           </footer>
//         </div>
//       `;

//       const pdfBuffer = await generatePDFBuffer(html);

//       for (const hostEmail of hostEmails) {
//         await sendEmail({
//           to: hostEmail,
//           subject: `📊 Final Summary for ${event.name}`,
//           html,
//           attachments: [{
//             filename: `${event.slug}-summary.pdf`,
//             content: pdfBuffer,
//             contentType: 'application/pdf'
//           }]
//         });
//       }
//     }

//     console.log(`[${new Date().toISOString()}] ✅ Sent summary reports with contributions`);
//   } catch (err) {
//     console.error(`[${new Date().toISOString()}] ❌ Final reminder error:`, err.message);
//   }
// };

// // ⏰ Run daily at 7:30 AM
// cron.schedule('30 7 * * *', sendFinalReminders);



// // Run once on startup
// sendFinalReminders();

// module.exports = sendFinalReminders;
