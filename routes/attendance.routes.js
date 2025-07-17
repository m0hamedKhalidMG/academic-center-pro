const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registerAttendance,
  getTodaysAttendance,
  processEndOfDay,
  getAttendanceReport,
  getAttendanceByDateAndGroup
} = require('../controllers/attendance.controller');

// Protected routes
router.use(protect);

// Assistant-only routes
router.route('/scan')
  .post(authorize('assistant'), registerAttendance);

router.route('/today')
  .get(authorize('assistant'), getTodaysAttendance);

router.route('/end-day')
  .post(authorize('assistant'), processEndOfDay);

// Admin-only routes
router.route('/report')
  .get(authorize('admin'), getAttendanceReport);
// routes/attendance.routes.js
router.get('/by-date-group', 
  protect,
  authorize('admin', 'assistant'),
  getAttendanceByDateAndGroup
);
module.exports = router;