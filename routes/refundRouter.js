// routes/refundRoutes.js

const express = require('express');
const { requestRefund, processRefund } = require('../controllers/refundController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/refund/request', authenticate, requestRefund);
router.post('/refund/process/:reference', authenticate, authorizeAdmin, processRefund);
router.get('/admin/refunds', isAdmin, listRefundRequests);
router.get('/refunds/history', authenticate, getUserRefundHistory);

//router.post('/admin/refunds/:requestId/decision', isAdmin, handleRefundDecision);


module.exports = router;
