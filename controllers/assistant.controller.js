const Assistant = require('../models/Assistant');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Suspension = require('../models/Suspension');
const {ErrorResponse} = require('../utils/errorHandler');

const bcrypt = require('bcryptjs');

// @desc    Get assistant profile
// @route   GET /api/v1/assistants/profile
// @access  Private/Assistant
exports.getAssistantProfile = async (req, res, next) => {
  try {
    const assistant = await Assistant.findById(req.user.id)
      .select('-password -__v');

    if (!assistant) {
      return next(new ErrorResponse('Assistant not found', 404));
    }

    res.status(200).json({
      success: true,
      data: assistant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update assistant profile
// @route   PUT /api/v1/assistants/profile
// @access  Private/Assistant
exports.updateAssistantProfile = async (req, res, next) => {
  try {
    const assistant = await Assistant.findById(req.user.id);

    if (!assistant) {
      return next(new ErrorResponse('Assistant not found', 404));
    }

    // Check if new email is already in use
    if (req.body.email && req.body.email !== assistant.email) {
      const existingEmail = await Assistant.findOne({ email: req.body.email });
      if (existingEmail) {
        return next(new ErrorResponse('Email already in use', 400));
      }
    }

    // Check if new card ID is already in use
    if (req.body.cardId && req.body.cardId !== assistant.cardId) {
      const existingCard = await Assistant.findOne({ cardId: req.body.cardId });
      if (existingCard) {
        return next(new ErrorResponse('Card ID already in use', 400));
      }
    }

    // Update fields
    assistant.name = req.body.name || assistant.name;
    assistant.email = req.body.email || assistant.email;
    assistant.cardId = req.body.cardId || assistant.cardId;

    // Update password if provided
    if (req.body.password) {
      assistant.password = req.body.password;
      await assistant.save();
      return res.status(200).json({
        success: true,
        data: {
          id: assistant._id,
          name: assistant.name,
          email: assistant.email,
          cardId: assistant.cardId
        },
        message: 'Profile and password updated successfully'
      });
    }

    await assistant.save();

    res.status(200).json({
      success: true,
      data: {
        id: assistant._id,
        name: assistant.name,
        email: assistant.email,
        cardId: assistant.cardId
      },
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get assistant's dashboard statistics
// @route   GET /api/v1/assistants/dashboard
// @access  Private/Assistant
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get counts
    const totalStudents = await Student.countDocuments({ isActive: true });
    const todaysAttendance = await Attendance.countDocuments({ 
      date: { $gte: today } 
    });
    
    // Get late payments
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const cutoffDate = new Date(currentYear, currentMonth, 10);
    
    let latePaymentsCount = 0;
    if (currentDate > cutoffDate) {
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const paidStudents = await Payment.find({
        month: previousMonth,
        year: previousYear,
        status: 'paid'
      }).distinct('student');

      const allStudents = await Student.countDocuments({ isActive: true });
      latePaymentsCount = allStudents - paidStudents.length;
    }

    // Get suspended students count
    const suspendedStudents = await Suspension.countDocuments({
      $or: [
        { type: 'permanent' },
        { type: 'temporary', endDate: { $gt: new Date() } }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        todaysAttendance,
        latePaymentsCount,
        suspendedStudents
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get students created by the assistant
// @route   GET /api/v1/assistants/my-students
// @access  Private/Assistant
exports.getMyStudents = async (req, res, next) => {
  try {
    const students = await Student.find({ 
      createdBy: req.user.id,
      isActive: true 
    }).select('-__v -createdAt -updatedAt');

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get today's attendance recorded by the assistant
// @route   GET /api/v1/assistants/my-attendance
// @access  Private/Assistant
exports.getMyTodaysAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      recordedBy: req.user.id,
      date: { $gte: today }
    })
      .populate('student', 'fullName academicLevel groupCode')
      .select('-__v');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get payments recorded by the assistant
// @route   GET /api/v1/assistants/my-payments
// @access  Private/Assistant
exports.getMyRecordedPayments = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const query = { recordedBy: req.user.id };

    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const payments = await Payment.find(query)
      .populate('student', 'fullName academicLevel groupCode')
      .select('-__v')
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

// @desc    Get suspensions issued by the assistant
// @route   GET /api/v1/assistants/my-suspensions
// @access  Private/Assistant
exports.getMyIssuedSuspensions = async (req, res, next) => {
  try {
    const suspensions = await Suspension.find({ issuedBy: req.user.id })
      .populate('student', 'fullName academicLevel groupCode')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suspensions.length,
      data: suspensions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Suspend a student
// @route   POST /api/v1/assistants/suspend
// @access  Private/Assistant
exports.suspendStudent = async (req, res, next) => {
  const { studentId, type, notes, endDate } = req.body;

  try {
    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    // Validate suspension type
    if (!['temporary', 'permanent'].includes(type)) {
      return next(new ErrorResponse('Invalid suspension type', 400));
    }

    // Validate end date for temporary suspension
    if (type === 'temporary' && !endDate) {
      return next(new ErrorResponse('End date is required for temporary suspension', 400));
    }

    // Create suspension
    const suspension = await Suspension.create({
      student: studentId,
      type,
      notes,
      endDate: type === 'temporary' ? new Date(endDate) : null,
      issuedBy: req.user.id
    });

    // Send notification to parent
    // await sendSuspensionNotice(student, suspension);
 student.isActive = false; // Set to false when suspended
    await student.save();
    res.status(201).json({
      success: true,
      data: suspension
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Lift suspension for a student
// @route   PUT /api/v1/assistants/lift-suspension/:suspensionId
// @access  Private/Assistant
exports.liftSuspension = async (req, res, next) => {
  try {
    // Find all suspensions for the specified student
    const suspensions = await Suspension.find({ student: req.params.studentId });
    const student = await Student.findById(req.params.studentId);

    if (!student) {
      return next(new ErrorResponse('Student not found', 404));
    }

    if (!suspensions || suspensions.length === 0) {
      return next(new ErrorResponse('No suspensions found for this student', 404));
    }

    // Filter suspensions issued by the current user (assistant)
    const userSuspensions = suspensions.filter(suspension => 
      suspension.issuedBy.toString() === req.user.id
    );

    if (userSuspensions.length === 0) {
      return next(new ErrorResponse('No suspensions issued by you for this student', 403));
    }

    // Process each suspension
    for (const suspension of userSuspensions) {
      if (suspension.type === 'temporary') {
        // For temporary suspensions, set end date to now
        suspension.endDate = new Date();
        await suspension.save();
      } else {
        // For permanent suspensions, delete the record
        await suspension.deleteOne();
      }
    }

    // Check if student has any remaining active suspensions
    const activeSuspensions = await Suspension.find({
      student: req.params.studentId,
      $or: [
        { type: 'permanent' },
        { 
          type: 'temporary',
          endDate: { $gte: new Date() } // Only suspensions that haven't expired
        }
      ]
    });

    // Update student's active status (true if no active suspensions remain)
    student.isActive = activeSuspensions.length === 0;
    await student.save();

    res.status(200).json({
      success: true,
      message: `${userSuspensions.length} suspension(s) lifted successfully`,
      data: {
        student: {
          id: student._id,
          isActive: student.isActive
        }
      }
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get active suspensions for a student
// @route   GET /api/v1/assistants/student-suspensions/:studentId
// @access  Private (Assistant/Admin)
exports.getActiveStudentSuspensions = async (req, res, next) => {
  try {
    const currentDate = new Date();
    
    const suspensions = await Suspension.find({ 
      student: req.params.studentId 
    }).populate('issuedBy', 'name email');

    // Categorize suspensions
    const result = {
      active: [],
      expired: [],
      permanent: []
    };

    suspensions.forEach(suspension => {
      if (suspension.type === 'permanent') { 
        result.permanent.push(suspension);
      } else if (suspension.type === 'temporary') {
        if (suspension.startDate <= currentDate && suspension.endDate >= currentDate) {
          result.active.push(suspension);
        } else {
          result.expired.push(suspension);
        }
      }
    });

    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (err) {
    next(err);
  }
};


