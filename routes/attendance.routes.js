const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registerAttendance,
  getTodaysAttendance,
  processEndOfDay,
  getAttendanceReport,
  getAttendanceByDateAndGroup,
  getGroupAttendanceReport,
  getDailyGroupAttendance
} = require('../controllers/attendance.controller');
// @desc    Get monthly group attendance report
// @route   GET /api/attendance/group-report
// @access  Private (Admin, Teacher)
router.get(
  '/group-report',
  protect,
  authorize('admin', 'assistant'),
  getGroupAttendanceReport
);

// @desc    Get daily group attendance
// @route   GET /api/attendance/daily-group
// @access  Private (Admin, Teacher)
router.get(
  '/daily-group',
  protect,
  authorize('admin', 'assistant'),
  getDailyGroupAttendance
);
// Protected routes
router.use(protect);

// Assistant-only routes
router.route('/scan')
  .post(authorize('assistant', 'admin'), registerAttendance);

router.route('/today')
  .get(authorize('assistant','admin'), getTodaysAttendance);

router.route('/end-day')
  .post(authorize('assistant','admin'), processEndOfDay);

// Admin-only routes
router.route('/report')
  .get(authorize('admin','assistant'), getAttendanceReport);
// routes/attendance.routes.js
router.get('/by-date-group', 
  protect,
  authorize('admin', 'assistant'),
  getAttendanceByDateAndGroup
);
module.exports = router;
