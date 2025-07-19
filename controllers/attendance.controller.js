const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Suspension = require('../models/Suspension');
const {ErrorResponse} = require('../utils/errorHandler');
const { sendAbsenceNotification } = require('../services/notification.service');

// @desc    Register attendance via card scan
// @route   POST /api/v1/attendance/scan
// @access  Private/Assistant
exports.registerAttendance = async (req, res, next) => {
  const { cardCode } = req.body;

  if (!cardCode) {
    return next(new ErrorResponse("Please provide card code", 400));
  }

  try {
    const student = await Student.findOne({ attendanceCardCode: cardCode });

    if (!student) {
      return next(new ErrorResponse("Student not found", 404));
    }

   

    const activeSuspension = await Suspension.findOne({
      student: student._id,
      $or: [
        { type: "permanent" },
        { type: "temporary", endDate: { $gt: new Date() } },
      ],
    });

    if (activeSuspension) {
      return res.status(200).json({
        success: false,
        data: {
          message: "Student is suspended",
          student: student,
          suspension: activeSuspension,
        },
      });
    }

    // Get local midnight time (Europe/Bucharest)
    const now = new Date();
    const localMidnight = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }).split(",")[0]
    );
    localMidnight.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      student: student._id,
      date: { $gte: localMidnight },
    });

    if (existingAttendance) {
      return next(
        new ErrorResponse("Attendance already registered today", 400)
      );
    }

    // Format scanned time for UI/logs
    const options = {
      timeZone: "Europe/Bucharest",
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    };
    const formattedCurrentDate = new Intl.DateTimeFormat(
      "en-US",
      options
    ).format(now);

    const attendance = await Attendance.create({
      student: student._id,
      date: localMidnight,
      status: "present",
      scannedAt: formattedCurrentDate,
      recordedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: {
        attendance,
        student,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get today's attendance
// @route   GET /api/v1/attendance/today
// @access  Private/Assistant
exports.getTodaysAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({ date: { $gte: today } })
      .populate('student', 'fullName academicLevel groupCode')
      .populate('recordedBy', 'name');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process end of day attendance
// @route   POST /api/v1/attendance/end-day
// @access  Private/Assistant
exports.processEndOfDay = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active students
    const allStudents = await Student.find({ isActive: true });

    // Get students who attended today
    const attendedStudents = await Attendance.find({ date: { $gte: today } })
      .distinct('student');

    // Find absent students
    const absentStudents = allStudents.filter(student => 
      !attendedStudents.includes(student._id.toString())
    );

    // Send notifications to parents of absent students
    const notificationResults = await Promise.all(
      absentStudents.map(student => 
        sendAbsenceNotification(student)
      )
    );

    res.status(200).json({
      success: true,
      data: {
        totalStudents: allStudents.length,
        presentCount: attendedStudents.length,
        absentCount: absentStudents.length,
        notificationsSent: notificationResults.filter(r => r.success).length,
        notificationErrors: notificationResults.filter(r => !r.success)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get attendance report
// @route   GET /api/v1/attendance/report
// @access  Private/Admin
exports.getAttendanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, academicLevel, groupCode } = req.query;

    const query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (academicLevel || groupCode) {
      query.student = {};
      
      if (academicLevel) {
        const students = await Student.find({ academicLevel });
        query.student.$in = students.map(s => s._id);
      }
      
      if (groupCode) {
        const students = await Student.find({ groupCode });
        if (query.student.$in) {
          query.student.$in = query.student.$in.filter(id => 
            students.map(s => s._id.toString()).includes(id.toString())
          );
        } else {
          query.student.$in = students.map(s => s._id);
        }
      }
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'fullName academicLevel groupCode')
      .populate('recordedBy', 'name');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};

// controllers/attendance.controller.js
exports.getAttendanceByDateAndGroup = async (req, res, next) => {
  try {
    const { date, groupCode } = req.query;

    if (!date || !groupCode) {
      return next(new ErrorResponse('Both date and groupCode are required', 400));
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // Get all students in the specified group
    const groupStudents = await Student.find({ 
      groupCode,
      isActive: true 
    });

    // Get attendance records for the specified date and group
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: selectedDate,
        $lt: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000) // Next day
      },
      student: { $in: groupStudents.map(s => s._id) }
    }).populate('student', 'fullName photo parentWhatsAppNumber');

    // Separate into present and absent students
    const presentStudents = attendanceRecords.map(record => ({
      ...record.student.toObject(),
      attendanceTime: record.scannedAt,
      status: 'present'
    }));

    const absentStudents = groupStudents.filter(student => 
      !attendanceRecords.some(record => 
        record.student._id.toString() === student._id.toString()
      )
    ).map(student => ({
      ...student.toObject(),
      status: 'absent'
    }));

    res.status(200).json({
      success: true,
      data: {
        date: selectedDate.toISOString().split('T')[0],
        groupCode,
        totalStudents: groupStudents.length,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        presentStudents,
        absentStudents
      }
    });

  } catch (err) {
    next(err);
  }
};
