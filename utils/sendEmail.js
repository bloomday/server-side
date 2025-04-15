const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  
  

const sendVerificationEmail = async (to, token) => {
  const url = `http://localhost:3000/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: '"Bloomday" <no-reply@bloomday.com>',
    to,
    subject: "Verify Your Email",
    html: `<p>Please verify your email by clicking <a href="${url}">here</a></p>`,
  });
};

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Bloomday Events" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendContributionReceipt = async ({ to, name, amount, eventTitle }) => {
    const formattedAmount = amount.toLocaleString("en-NG");
  
    await transporter.sendMail({
      from: `"Bloomday Events" <${process.env.GMAIL_USER}>`,
      to,
      subject: `🎉 Contribution Receipt for ${eventTitle}`,
      html: `
        <h2>Hi ${name},</h2>
        <p>Thank you for contributing <strong>₦${formattedAmount}</strong> to <strong>${eventTitle}</strong>.</p>
        <p>Your support means the world. 🙌</p>
        <br/>
        <p><small>Sent on ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</small></p>
        <p>Cheers,<br/>The Bloomday Team</p>
      `,
    });
  };
  

module.exports = {
  sendVerificationEmail,
  sendEmail,
  sendContributionReceipt,
};
