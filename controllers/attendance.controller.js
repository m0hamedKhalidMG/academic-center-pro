const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Suspension = require('../models/Suspension');
const {ErrorResponse} = require('../utils/errorHandler');
const Group = require('../models/Group');

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


exports.getGroupAttendanceReport = async (req, res, next) => {
  try {
    const { month, year, groupCode } = req.query;

    // Validate input
    if (!month || !year || !groupCode) {
      return next(new ErrorResponse('Month, year and groupCode are required', 400));
    }

    // Get the group with its schedule
    const group = await Group.findOne({ code: groupCode });
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    // Get all active students in the group
    const students = await Student.find({ 
      groupCode,
      isActive: true 
    }).select('_id fullName  parentWhatsAppNumber phoneNumber attendanceCardCode  ');

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    // Get all attendance records for these students in this month
    const attendanceRecords = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    // Get group's scheduled days (e.g., ['monday', 'wednesday'])
    const scheduledDays = group.schedule.map(s => s.day.toLowerCase());

    // Helper to check if a date is a scheduled day
    const isScheduledDay = (date) => {
      const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      return scheduledDays.includes(day);
    };

    // Generate all scheduled dates in the month
    const scheduledDates = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (isScheduledDay(currentDate)) {
        scheduledDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Prepare report data structure
    const report = {
      groupCode,
      groupName: group.code, // or any other group identifier you have
      academicLevel: group.academicLevel,
      month: `${year}-${month.toString().padStart(2, '0')}`,
      totalScheduledDays: scheduledDates.length,
      students: []
    };

    // Process each student
    for (const student of students) {
      const studentReport = {
        studentId: student._id,
        fullName: student.fullName,
        parentWhatsAppNumber: student.parentWhatsAppNumber,
        attendanceDays: 0,
        absentDays: 0,
        attendanceRate: 0,
        details: []
      };

      // Check each scheduled date
      for (const date of scheduledDates) {
        const attendance = attendanceRecords.find(record => 
          record.student.equals(student._id) && 
          record.date.toDateString() === date.toDateString()
        );

        studentReport.details.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-US', { weekday: 'long' }),
          status: attendance ? 'present' : 'absent',
          time: attendance ? attendance.scannedAt : null
        });

        if (attendance) {
          studentReport.attendanceDays++;
        } else {
          studentReport.absentDays++;
        }
      }

      // Calculate attendance rate
      if (scheduledDates.length > 0) {
        studentReport.attendanceRate = 
          Math.round((studentReport.attendanceDays / scheduledDates.length) * 100);
      }

      report.students.push(studentReport);
    }

    // Calculate group statistics
    report.totalStudents = students.length;
    report.averageAttendanceRate = report.students.length > 0 ?
      Math.round(report.students.reduce((sum, student) => sum + student.attendanceRate, 0) / report.students.length) :
      0;

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (err) {
    next(err);
  }
};
exports.getDailyGroupAttendance = async (req, res, next) => {
  try {
    const { date, groupCode } = req.query;

    if (!date || !groupCode) {
      return next(new ErrorResponse('Both date and groupCode are required', 400));
    }

    const timeZone = "Europe/Bucharest";
    const selectedDate = new Date(date);
    selectedDate.setUTCHours(0, 0, 0, 0); // لتوحيد اليوم من منتصف الليل UTC
console.log(selectedDate)
    // Get group
    const group = await Group.findOne({ code: groupCode });
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    // تحديد اليوم في الأسبوع بناءً على التوقيت المطلوب
    const getDayOfWeek = (date, timeZone) => {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone })
        .format(date)
        .toLowerCase();
    };
    const dayOfWeek = getDayOfWeek(selectedDate, timeZone);

    // تحقق من أن اليوم موجود في جدول المجموعة
    const isScheduledDay = group.schedule.some(s => s.day.toLowerCase() === dayOfWeek);
    if (!isScheduledDay) {
      return res.status(200).json({
        success: true,
        data: {
          date: selectedDate.toISOString().split('T')[0],
          day: dayOfWeek,
          groupCode,
          isScheduledDay: false,
          message: 'No classes scheduled for this group on this day'
        }
      });
    }

    // الطلاب النشطون
    const groupStudents = await Student.find({ 
      groupCode,
      isActive: true 
    }).select('fullName  parentWhatsAppNumber');

    // جلب الحضور في هذا التاريخ
    const nextDay = new Date(selectedDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const attendanceRecords = await Attendance.find({
      date: {
        $gte: selectedDate,
        $lt: nextDay
      },
      student: { $in: groupStudents.map(s => s._id) }
    }).populate('student', 'fullName  parentWhatsAppNumber phoneNumber attendanceCardCode');

    const formatDateTime = (date, timeZone) => {
      const options = {
        timeZone,
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      };
      return date.toLocaleString("en-US", options);
    };

    // الطلاب الحاضرين
    const presentStudents = attendanceRecords.map(record => ({
      student: record.student,
      attendanceTime: formatDateTime(record.scannedAt, timeZone),
      status: 'present'
    }));

    // الطلاب الغائبين
    const absentStudents = groupStudents.filter(student => 
      !attendanceRecords.some(record => record.student._id.equals(student._id))
    ).map(student => ({
      student,
      status: 'absent'
    }));

    // الإخراج النهائي
    res.status(200).json({
      success: true,
      data: {
        date: selectedDate.toISOString().split('T')[0],
        day: dayOfWeek,
        groupCode,
        isScheduledDay: true,
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
