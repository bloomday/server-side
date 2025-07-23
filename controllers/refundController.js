const axios = require('axios');
const RefundRequest = require('../models/refundRequestModel');
const Event = require('../models/eventModel');
const { sendRefundRequestConfirmation } = require('../utils/sendRefundRequestConfirmation');
const { sendRefundDecisionEmail } = require('../utils/sendRefundDecisionEmail');


exports.requestRefund = async (req, res) => {
  const { reference, reason } = req.body;
  const user = req.user;

  try {
    // Optional: Validate user ownership of transaction
    const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const tx = verifyRes.data.data;

    if (tx.status !== 'success') {
      return res.status(400).json({ error: 'Transaction was not successful.' });
    }

    const existing = await RefundRequest.findOne({ reference });
    if (existing) return res.status(409).json({ message: 'Refund already requested for this reference.' });

    const refundDoc = await RefundRequest.create({
      reference,
      eventId: tx.metadata.eventId,
      user: user?._id || null,
      name: tx.metadata.name || '',
      email: tx.metadata.email || '',
      amount: tx.amount / 100,
      reason,
      initiatedByAdmin: user?.role === 'admin',
    });
    await sendRefundRequestConfirmation(user.email, user.name, reference, reason);


    res.status(201).json({ message: 'Refund request logged', data: refundDoc });
  } catch (err) {
    console.error('Refund request failed:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to request refund' });
  }
};

exports.processRefund = async (req, res) => {
  const { reference } = req.params;

  try {
    const refundDoc = await RefundRequest.findOne({ reference });
    if (!refundDoc) return res.status(404).json({ error: 'Refund request not found' });

    refundDoc.status = 'processing';
    await refundDoc.save();

    const refundRes = await axios.post(
      `https://api.paystack.co/refund`,
      { transaction: reference, reason: refundDoc.reason },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    refundDoc.status = 'refunded';
    refundDoc.refundedAt = new Date();
    await refundDoc.save();

    res.status(200).json({ message: 'Refund processed successfully', data: refundDoc });
  } catch (err) {
    console.error('Refund process error:', err?.response?.data || err);

    await RefundRequest.findOneAndUpdate(
      { reference: req.params.reference },
      {
        status: 'failed',
        failureReason: err?.response?.data?.message || 'Refund API call failed',
      }
    );

    res.status(500).json({ error: 'Failed to process refund' });
  }
};



exports.getUserRefundHistory = async (req, res) => {
  try {
    const refunds = await RefundRequest.find({ user: req.user._id }).populate('event', 'name date');
    res.status(200).json({ data: refunds });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch your refund history' });
  }
};

exports.updateRefundStatus = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { status, responseMessage } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const refund = await RefundRequest.findById(refundId);
    if (!refund) return res.status(404).json({ message: 'Refund request not found' });

    if (status === 'approved') {
      const paystackRefund = await axios.post(
        'https://api.paystack.co/refund',
        {
          transaction: refund.contributionId.toString(),
          currency: 'NGN'
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      refund.paystackRefundData = paystackRefund.data.data;
    }

    refund.status = status;
    refund.adminResponse = responseMessage;
    refund.updatedAt = new Date();
    await refund.save();

    await sendRefundDecisionEmail(refund.user.email, refund.user.name, refund.reference, refund.status);


    res.status(200).json({ message: `Refund ${status}`, refund });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update refund status' });
  }
};

