// utils/emails/sendRefundRequestConfirmation.js
const { sendEmail } = require('../sendEmail');

exports.sendRefundRequestConfirmation = async (to, name, reference, reason) => {
  await sendEmail({
    to,
    subject: 'Refund Request Received',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${name},</h2>
        <p>We've received your refund request for payment <strong>${reference}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>We'll notify you once it's reviewed by our team.</p>
        <br />
        <p>– Bloomday Team</p>
      </div>
    `
  });
};
