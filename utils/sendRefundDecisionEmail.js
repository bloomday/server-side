
const { sendEmail } = require('../sendEmail');

exports.sendRefundDecisionEmail = async (to, name, reference, status) => {
  const decisionText = status === 'approved'
    ? 'Your refund has been approved. You’ll receive it shortly.'
    : 'Your refund request has been rejected.';

  await sendEmail({
    to,
    subject: `Refund Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${name},</h2>
        <p>Your refund request for payment <strong>${reference}</strong> has been <strong>${status}</strong>.</p>
        <p>${decisionText}</p>
        <br />
        <p>– Bloomday Team</p>
      </div>
    `
  });
};
