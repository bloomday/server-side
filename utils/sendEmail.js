

// const sendMail = async ({ to, subject, html }) => {
//   try {
//     await transporter.sendMail({
//       from: `"Bloomday Events" <${process.env.GMAIL_USER}>`,
//       to,
//       subject,
//       html,
//     });
//   } catch (error) {
//     console.error("Email sending error:", error);
//     throw new Error("Email delivery failed");
//   }
// };

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },

});

// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_PASS, // This should be an App Password, not your main Gmail password
//   },
//   pool: true,           // keep connection alive
//   maxConnections: 1,    // single connection
//   maxMessages: 50,      // refresh after sending 50 messages
//   rateLimit: 5,         // send at most 5 per second
//   tls: {
//     rejectUnauthorized: false, // needed only if self-signed
//   }
// });





const sendMail = async ({ to, subject, html }) => {
  try {
  await transporter.sendMail({
    from: `"Bloomday Events" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
} catch (error) {
  console.error("Email sending error:", error);
  throw new Error("Email delivery failed");
}
};


const sendVerificationEmail = async (to, token, type = "verify") => {
  const baseUrl = `${process.env.FRONTEND_URL}/auth/`;
  const link =
    type === "verify"
      ? `${baseUrl}verify-email?token=${token}`
      : `${baseUrl}reset-password?token=${token}`;

  const subject = type === "verify" ? "Verify Your Email" : "Reset Your Password";
  const html =
    type === "verify"
      ? `<p>Please verify your email by clicking <a href="${link}">here</a>.</p>`
      : `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 1 hour.</p>`;

  await sendMail({ to, subject, html });
};

const sendEmail = async ({ to, subject, html }) => {
  await sendMail({ to, subject, html });
};

const sendContributionReceipt = async ({ to, name, amount, eventTitle }) => {
  const formattedAmount = amount.toLocaleString("en-NG");
  const subject = `🎉 Contribution Receipt for ${eventTitle}`;
  const html = `
    <h2>Hi ${name},</h2>
    <p>Thank you for contributing <strong>₦${formattedAmount}</strong> to <strong>${eventTitle}</strong>.</p>
    <p>Your support means the world. 🙌</p>
    <p><small>Sent on ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</small></p>
    <p>Cheers,<br/>The Bloomday Team</p>
  `;
  await sendMail({ to, subject, html });
};

module.exports = { 
  sendVerificationEmail,
  sendEmail,
  sendMail,
  sendContributionReceipt,
};
