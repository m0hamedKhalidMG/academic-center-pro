// controllers/group.controller.js
const Group = require('../models/Group');
const { ErrorResponse } = require('../utils/errorHandler');
const Student = require('../models/Student');

// Helper function to validate schedule
const validateSchedule = (schedule) => {
  const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!Array.isArray(schedule)) {
    return { valid: false, message: 'Schedule must be an array' };
  }

  for (const daySchedule of schedule) {
    if (!validDays.includes(daySchedule.day)) {
      return { valid: false, message: `Invalid day: ${daySchedule.day}` };
    }
    if (!timeRegex.test(daySchedule.startTime) || !timeRegex.test(daySchedule.endTime)) {
      return { valid: false, message: 'Invalid time format (use HH:MM)' };
    }
  }

  return { valid: true };
};

// Create Group
exports.createGroup = async (req, res, next) => {
  try {
    const { code, academicLevel, schedule, maxStudents } = req.body;

    // Validate input
    if (!code || !academicLevel || !schedule) {
      return next(new ErrorResponse('Missing required fields', 400));
    }

    // Validate schedule
    const scheduleValidation = validateSchedule(schedule);
    if (!scheduleValidation.valid) {
      return next(new ErrorResponse(scheduleValidation.message, 400));
    }

    // Check if group exists
    const existingGroup = await Group.findOne({ code });
    if (existingGroup) {
      return next(new ErrorResponse('Group code already exists', 400));
    }

    // Create group
    const group = await Group.create({
      code,
      academicLevel,
      schedule,
      maxStudents: maxStudents || 20,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: group
    });

  } catch (err) {
    next(err);
  }
};

// Get All Groups
exports.getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find();
    
    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    next(err);
  }
};

// Get Single Group
exports.getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

// Update Group
exports.updateGroup = async (req, res, next) => {
  try {
    const { code, academicLevel, schedule, maxStudents } = req.body;

    let group = await Group.findById(req.params.id);
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    // Validate schedule if provided
    if (schedule) {
      const scheduleValidation = validateSchedule(schedule);
      if (!scheduleValidation.valid) {
        return next(new ErrorResponse(scheduleValidation.message, 400));
      }
      group.schedule = schedule;
    }

    // Update other fields if provided
    if (code) group.code = code;
    if (academicLevel) group.academicLevel = academicLevel;
    if (maxStudents) group.maxStudents = maxStudents;

    // Save changes
    group = await group.save();

    res.status(200).json({
      success: true,
      data: group
    });

  } catch (err) {
    next(err);
  }
};

// Delete Group
exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    // Check if group has students assigned
    const studentsCount = await Student.countDocuments({ groupCode: group.code });
    if (studentsCount > 0) {
      return next(new ErrorResponse(
        `Cannot delete group with ${studentsCount} assigned students`, 
        400
      ));
    }

    await group.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    next(err);
  }
};
