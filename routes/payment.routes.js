const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  recordPayment,
  getStudentPayments,
  getLatePayments,
  sendLatePaymentReminders,
  getPaymentSummary
} = require('../controllers/payment.controller');

// Protected routes
router.use(protect);

// Assistant-only routes
router.route('/')
  .post(authorize('assistant','admin'), recordPayment);

router.route('/student/:studentId')
  .get(authorize('assistant','admin'), getStudentPayments);

router.route('/late')
  .get(authorize('assistant','admin'), getLatePayments)
  .post(authorize('assistant','admin'), sendLatePaymentReminders);

// Admin-only routes
router.route('/summary')
  .get(authorize('admin','admin'), getPaymentSummary);

module.exports = router;
