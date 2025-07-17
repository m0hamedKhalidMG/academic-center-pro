const Student = require('../models/Student');
const {ErrorResponse} = require('../utils/errorHandler');

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