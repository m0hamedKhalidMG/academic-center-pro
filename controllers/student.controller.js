const Student = require('../models/Student');
const {ErrorResponse} = require('../utils/errorHandler');
const Suspension = require('../models/Suspension');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');

// @desc    Create student account
// @route   POST /api/v1/students
// @access  Private/Assistant
exports.createStudent = async (req, res, next) => {

  const {
    fullName,
    photo,
    phoneNumber,
    parentWhatsAppNumber,
    academicLevel,
    groupCode,
    attendanceCardCode
  } = req.body;
  try {
    // Check if card code already exists
    const existingCard = await Student.findOne({ attendanceCardCode });
    if (existingCard) {
      return next(new ErrorResponse('Attendance card code already in use', 400));
    }

    const student = await Student.create({
      fullName,
      photo,
      phoneNumber,
      parentWhatsAppNumber,
      academicLevel,
      groupCode,
      attendanceCardCode,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all students
// @route   GET /api/v1/students
// @access  Private/Assistant
exports.getStudents = async (req, res, next) => {
  try {
    const students = await Student.find({ isActive: true });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student by ID
// @route   GET /api/v1/students/:id
// @access  Private/Assistant
exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update student account
// @route   PUT /api/v1/students/:id
// @access  Private/Assistant
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    // Check if new card code is already in use
    if (req.body.attendanceCardCode && req.body.attendanceCardCode !== student.attendanceCardCode) {
      const existingCard = await Student.findOne({ attendanceCardCode: req.body.attendanceCardCode });
      if (existingCard) {
        return next(new ErrorResponse('Attendance card code already in use', 400));
      }
    }

    // Update fields
    student.fullName = req.body.fullName || student.fullName;
    student.photo = req.body.photo || student.photo;
    student.phoneNumber = req.body.phoneNumber || student.phoneNumber;
    student.parentWhatsAppNumber = req.body.parentWhatsAppNumber || student.parentWhatsAppNumber;
    student.academicLevel = req.body.academicLevel || student.academicLevel;
    student.groupCode = req.body.groupCode || student.groupCode;
    student.attendanceCardCode = req.body.attendanceCardCode || student.attendanceCardCode;
    student.isActive = req.body.isActive !== undefined ? req.body.isActive : student.isActive;

    await student.save();

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Deactivate student account
// @route   DELETE /api/v1/students/:id
// @access  Private/Assistant
exports.deactivateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    student.isActive = false;
    await student.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student details by card code
// @route   GET /api/v1/students/scan/:cardCode
// @access  Private (Assistant/Admin)
exports.getStudentByCardCode = async (req, res, next) => {
  try {
    const { cardCode } = req.params;

    // Find student by card code
    const student = await Student.findOne({ attendanceCardCode: cardCode })
      .populate('createdBy', 'name email');

    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    // Get active suspensions separately
    const activeSuspensions = await Suspension.find({
      student: student._id,
      $or: [
        { type: 'permanent' },
        { 
          type: 'temporary',
          endDate: { $gte: new Date() }
        }
      ]
    }).populate('issuedBy', 'name email');

    // Get attendance summary
    const attendanceSummary = await Attendance.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "present"] }, 1, 0] 
            } 
          },
          absentDays: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0] 
            } 
          }
        }
      }
    ]);

    // Get payment status
    const latestPayment = await Payment.findOne({ student: student._id })
      .sort({ date: -1 })
      .select('amount date status month paymentDate');

    // Format response
    const response = {
      student: {
        id: student._id,
        fullName: student.fullName,
        photo: student.photo,
        phoneNumber: student.phoneNumber,
        parentWhatsAppNumber: student.parentWhatsAppNumber,
        academicLevel: student.academicLevel,
        groupCode: student.groupCode,
        isActive: student.isActive,
        createdBy: student.createdBy
      },
      status: {
        isSuspended: activeSuspensions.length > 0,
        activeSuspensions: activeSuspensions,
        attendance: attendanceSummary[0] || { totalDays: 0, presentDays: 0, absentDays: 0 },
        paymentStatus: latestPayment ? {
          status: latestPayment.status,
          lastPaymentDate: latestPayment.paymentDate,
          lastmonth:latestPayment.month,
          amount: latestPayment.amount
        } : null
      }
    };
    res.status(200).json({
      success: true,
      data: response
    });

  } catch (err) {
    next(err);
  }
};
