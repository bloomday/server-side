const axios = require("axios");
const Event = require("../models/eventModel");
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");
const { sendContributionReceipt } = require("../utils/sendEmail");



exports.initializePayment = async (req, res) => {
    const { eventId } = req.params;
    const { amount, message, name, email } = req.body; 
    const user = req.user;
  
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.allowCrowdfunding) {
        return res
          .status(400)
          .json({ error: "Crowdfunding not allowed for this event." });
      }
  
      const reference = uuidv4();
  
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: user?.email || email,
          amount: amount * 100,
          reference,
          metadata: {
            eventId,
            message,
            userId: user?._id?.toString() || null,
            name: user?.name || name, 
            email: user?.email || email,
          },
          callback_url: `${process.env.BACKEND_URL}/verify/${reference}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      res.status(200).json({
        authorization_url: response.data.data.authorization_url,
      });
    } catch (err) {
      console.error(err?.response?.data || err);
      res.status(500).json({ error: "Failed to initialize payment" });
    }
  };

  exports.initializePayments = async (req, res) => {
    const { eventId } = req.params;
    const { amount, message, name, email } = req.body;
    const user = req.user;
  
    try {
      const event = await Event.findById(eventId).populate('hosts');
      if (!event || !event.allowCrowdfunding) {
        return res.status(400).json({ error: "Crowdfunding not allowed for this event." });
      }
  
      const mainHost = event.hosts[0]; // assuming first host is primary
      if (!mainHost.subaccountCode) {
        return res.status(400).json({ error: "Host does not have a subaccount set up." });
      }
  
      const reference = uuidv4();
  
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: user?.email || email,
          amount: amount * 100,
          reference,
          metadata: {
            eventId,
            message,
            userId: user?._id?.toString() || null,
            name: user?.name || name,
            email: user?.email || email,
          },
          subaccount: mainHost.subaccountCode,
          split: {
            type: "percentage",
            bearer_type: "subaccount",
            percentage: 90, // 90% to host, 10% to Bloomday
          },
          callback_url: `${process.env.BACKEND_URL}/verify/${reference}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      res.status(200).json({
        authorization_url: response.data.data.authorization_url,
      });
    } catch (err) {
      console.error(err?.response?.data || err);
      res.status(500).json({ error: "Failed to initialize payment" });
    }
  };
  
  
exports.verifyPayment = async (req, res) => {
    const { reference } = req.params;
  
    try {
      const verifyResponse = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );
  
      const data = verifyResponse.data.data;
  
      if (data.status !== "success") {
        return res.status(400).json({ error: "Payment not successful." });
      }
  
      const { metadata } = data;
  
      const event = await Event.findById(metadata.eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });
  
      event.contributions.push({
        user: metadata.userId || null,
        name: metadata.name || '',
        email: metadata.email || '',
        amount: data.amount / 100,
        message: metadata.message,
        paidAt: new Date(),
      });
  
      await event.save();
  
      await sendContributionReceipt({
        to: metadata.email,
        name: metadata.name,
        amount: data.amount / 100,
        eventTitle: event.name,
      });
  
      res.redirect(
        `${process.env.FRONTEND_URL}/event-success.html?eventId=${event._id}`
      );
    } catch (err) {
      console.error(err?.response?.data || err);
      res.status(500).json({ error: "Payment verification failed" });
    }
  };
  

exports.paystackWebhook = async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");
  
    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).json({ message: "Unauthorized webhook request" });
    }
  
    const payload = JSON.parse(req.body);
  
    if (payload.event === "charge.success") {
      const data = payload.data;
      const metadata = data.metadata;
  
      try {
        const event = await Event.findById(metadata.eventId);
        if (!event) return res.status(404).json({ error: "Event not found" });
  
        event.contributions.push({
          user: metadata.userId || null,
          name: metadata.name || '',
          email: metadata.email || '',
          amount: data.amount / 100,
          message: metadata.message,
          paidAt: new Date(data.paid_at),
        });
  
        await event.save();
  
        await sendContributionReceipt({
          to: metadata.email,
          name: metadata.name,
          amount: data.amount / 100,
          eventTitle: event.title,
        });
      } catch (err) {
        console.error("Webhook processing error:", err);
      }
    }
  
    res.sendStatus(200);
  };

  const { createSubaccountOnPaystack } = require('../utils/paystackHelper');

exports.setupPayoutDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountNumber, bankCode, businessName } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Call Paystack to create subaccount
    const subaccount = await createSubaccountOnPaystack({
      business_name: businessName || user.name,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 90, // Host receives 90%, Bloomday keeps 10%
    });

    user.subaccountCode = subaccount.subaccount_code;
    user.bankInfo = {
      accountNumber,
      bankCode,
      accountName: subaccount.account_name,
    };

    await user.save();

    res.status(200).json({
      message: 'Payout setup successful',
      subaccountCode: user.subaccountCode,
    });
  } catch (err) {
    console.error('Subaccount creation failed:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to set up payout' });
  }
};

  
