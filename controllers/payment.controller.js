const Payment = require('../models/Payment');
const Student = require('../models/Student');
const {ErrorResponse} = require('../utils/errorHandler');

// @desc    Record payment
// @route   POST /api/v1/payments
// @access  Private/Assistant
exports.recordPayment = async (req, res, next) => {
  const { cardCode, month, year, amount, method } = req.body;

  if (!cardCode || !month || !year || !amount || !method) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  try {
    // 1. Find student by cardCode
    const student = await Student.findOne({ attendanceCardCode: cardCode });
    if (!student) {
      return next(new ErrorResponse('Student not found with this card code', 404));
    }

    // 2. Check if payment exists for this month/year
    const existingPayment = await Payment.findOne({
      student: student._id,
      month,
      year
    });

    if (existingPayment) {
      return next(new ErrorResponse('Payment already recorded for this month', 400));
    }

    // 3. Create payment record
    const payment = await Payment.create({
      student: student._id,
      month,
      year,
      amount,
      method,
      paymentDate: new Date(),
      status: 'paid',
      recordedBy: req.user.id,
      cardCodeUsed: cardCode // Optional: store which card was used
    });

    // 4. Send payment confirmation
    // const notificationService = require('../services/notification.service');
    // await notificationService.sendPaymentConfirmation(student, payment);

    // 5. Return response
    res.status(201).json({
      success: true,
      data: {
        payment,
        student: {
          id: student._id,
          name: student.fullName,
          level: student.academicLevel
        }
      }
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Get payments for a student
// @route   GET /api/v1/payments/student/:studentId
// @access  Private/Assistant
exports.getStudentPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ student: req.params.studentId })
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get late payments
// @route   GET /api/v1/payments/late
// @access  Private/Assistant
// controllers/payment.controller.js
exports.getLatePayments = async (req, res, next) => {
  try {
    const { month, groupCode } = req.query;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();

    // Calculate cutoff date (10th of current month)
    const cutoffDate = new Date(currentYear, currentMonth - 1, 10);

    // Only consider late payments if current date is after cutoff
    const isLatePeriod = currentDate > cutoffDate;

    // Base query for unpaid students
    let query = { isActive: true };

    // Apply group filter if provided
    if (groupCode) {
      query.groupCode = groupCode;
    }

    // Get all active students (filtered by group if specified)
    const students = await Student.find(query);

    // Get paid students for the target month
    const targetMonth = month ? parseInt(month) : currentMonth - 1;
    const targetYear = month ? currentYear : (currentMonth === 1 ? currentYear - 1 : currentYear);

    const paidStudents = await Payment.find({
      month: targetMonth,
      year: targetYear,
      status: 'paid'
    }).distinct('student');

    // Find unpaid students
    const unpaidStudents = students.filter(student => 
      !paidStudents.includes(student._id.toString())
    );

    // Only return late payments if we're in the late period
    // or if specifically querying a past month
    const results = (isLatePeriod || month) ? unpaidStudents : [];

    res.status(200).json({
      success: true,
      count: results.length,
      data: {
        month: targetMonth,
        year: targetYear,
        group: groupCode || 'all',
        isLatePeriod,
        cutoffDate,
        students: results.map(student => ({
          id: student._id,
          name: student.fullName,
          groupCode: student.groupCode,
          level: student.academicLevel,
          parentContact: student.parentWhatsAppNumber
        }))
      }
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Send late payment reminders
// @route   POST /api/v1/payments/send-reminders
// @access  Private/Assistant
exports.sendLatePaymentReminders = async (req, res, next) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const cutoffDate = new Date(currentYear, currentMonth, 10);

    // Only proceed if we're in the late period
    if (currentDate <= cutoffDate) {
      return res.status(200).json({
        success: true,
        message: 'Not in late payment period yet',
        data: {}
      });
    }

    // Get late payments
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const allStudents = await Student.find({ isActive: true });
    const paidStudents = await Payment.find({
      month: previousMonth,
      year: previousYear,
      status: 'paid'
    }).distinct('student');

    const unpaidStudents = allStudents.filter(student => 
      !paidStudents.includes(student._id.toString())
    );

    // Send notifications
    const notificationResults = await Promise.all(
      unpaidStudents.map(student => 
        sendPaymentReminder(student, previousMonth, previousYear)
      )
    );

    res.status(200).json({
      success: true,
      data: {
        totalUnpaid: unpaidStudents.length,
        notificationsSent: notificationResults.filter(r => r.success).length,
        notificationErrors: notificationResults.filter(r => !r.success)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get payment summary
// @route   GET /api/v1/payments/summary
// @access  Private/Admin
exports.getPaymentSummary = async (req, res, next) => {
  try {
    const { year } = req.query;
    const query = {};

    if (year) {
      query.year = parseInt(year);
    }

    const payments = await Payment.find(query);

    // Group by month and calculate totals
    const summary = payments.reduce((acc, payment) => {
      const key = `${payment.year}-${payment.month}`;
      if (!acc[key]) {
        acc[key] = {
          year: payment.year,
          month: payment.month,
          totalAmount: 0,
          paymentCount: 0,
          cashCount: 0,
          transferCount: 0,
          cardCount: 0
        };
      }

      acc[key].totalAmount += payment.amount;
      acc[key].paymentCount += 1;

      if (payment.method === 'cash') acc[key].cashCount += 1;
      if (payment.method === 'transfer') acc[key].transferCount += 1;
      if (payment.method === 'card') acc[key].cardCount += 1;

      return acc;
    }, {});

    const result = Object.values(summary).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
