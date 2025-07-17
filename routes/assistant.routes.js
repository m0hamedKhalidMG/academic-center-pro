const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAssistantProfile,
  updateAssistantProfile,
  getDashboardStats,
  getMyStudents,
  getMyTodaysAttendance,
  getMyRecordedPayments,
  getMyIssuedSuspensions,
  suspendStudent,
  liftSuspension
} = require('../controllers/assistant.controller');

// Apply authentication middleware to all routes
router.use(protect);
router.use(authorize('assistant'));

// Profile routes
router.route('/profile')
  .get(getAssistantProfile)          // Get assistant profile
  .put(updateAssistantProfile);      // Update assistant profile

// Dashboard route
router.route('/dashboard')
  .get(getDashboardStats);           // Get dashboard statistics

// Student management routes
router.route('/my-students')
  .get(getMyStudents);               // Get students created by assistant

// Attendance routes
router.route('/my-attendance')
  .get(getMyTodaysAttendance);       // Get today's attendance records

// Payment routes
router.route('/my-payments')
  .get(getMyRecordedPayments);       // Get payments recorded by assistant

// Suspension routes
router.route('/my-suspensions')
  .get(getMyIssuedSuspensions);      // Get suspensions issued by assistant

router.route('/suspend')
  .post(suspendStudent);             // Suspend a student

router.route('/lift-suspension/:suspensionId')
  .put(liftSuspension);              // Lift a suspension

module.exports = router;