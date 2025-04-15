// routes/contribution.js

const express = require('express');
const router = express.Router();
const { initializePayment,
    verifyPayment,
    paystackWebhook } = require('../controllers/contributionController');
const authenticateUser = require('../middlewares/authMiddleware');

router.post('/pay/:eventId',  initializePayment);

router.get('/verify/:reference', verifyPayment);

router.post('/paystack', express.raw({ type: 'application/json' }), paystackWebhook);



module.exports = router;
