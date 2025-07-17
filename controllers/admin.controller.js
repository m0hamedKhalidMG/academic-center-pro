const Assistant = require('../models/Assistant');
const {ErrorResponse }= require('../utils/errorHandler');
const bcrypt = require('bcryptjs');

// @desc    Create assistant account
// @route   POST /api/v1/admin/assistants
// @access  Private/Admin
exports.createAssistant = async (req, res, next) => {
  const { name, email, password, cardId } = req.body;
  try {
    // Check if email or cardId already exists
    const existingEmail = await Assistant.findOne({ email });
    if (existingEmail) {
      return next(new ErrorResponse('Email already in use', 400));
    }

    if (cardId) {
      const existingCard = await Assistant.findOne({ cardId });
      if (existingCard) {
        return next(new ErrorResponse('Card ID already in use', 400));
      }
    }

    const assistant = await Assistant.create({
      name,
      email,
      password,
      cardId,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: {
        id: assistant._id,
        name: assistant.name,
        email: assistant.email,
        cardId: assistant.cardId,
        isActive: assistant.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all assistants
// @route   GET /api/v1/admin/assistants
// @access  Private/Admin
exports.getAssistants = async (req, res, next) => {
  try {
    const assistants = await Assistant.find().select('-password');

    res.status(200).json({
      success: true,
      count: assistants.length,
      data: assistants
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update assistant account
// @route   PUT /api/v1/admin/assistants/:id
// @access  Private/Admin
exports.updateAssistant = async (req, res, next) => {
  try {
    const assistant = await Assistant.findById(req.params.id);

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

    // Check if new cardId is already in use
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
    assistant.isActive = req.body.isActive !== undefined ? req.body.isActive : assistant.isActive;

    if (req.body.password) {
      assistant.password = req.body.password;
    }

    await assistant.save();

    res.status(200).json({
      success: true,
      data: {
        id: assistant._id,
        name: assistant.name,
        email: assistant.email,
        cardId: assistant.cardId,
        isActive: assistant.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete assistant account
// @route   DELETE /api/v1/admin/assistants/:id
// @access  Private/Admin
exports.deleteAssistant = async (req, res, next) => {
  try {
    const assistant = await Assistant.findById(req.params.id);

    if (!assistant) {
      return next(new ErrorResponse('Assistant not found', 404));
    }

    await assistant.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset assistant password
// @route   PUT /api/v1/admin/assistants/:id/reset-password
// @access  Private/Admin
exports.resetAssistantPassword = async (req, res, next) => {
  try {
    const assistant = await Assistant.findById(req.params.id);

    if (!assistant) {
      return next(new ErrorResponse('Assistant not found', 404));
    }

    // Generate a random password
    const newPassword = Math.random().toString(36).slice(-8);
    assistant.password = newPassword;

    await assistant.save();

    // In a real application, you would send the new password to the assistant's email
    // For this example, we'll just return it in the response
    res.status(200).json({
      success: true,
      data: {
        newPassword: newPassword
      }
    });
  } catch (err) {
    next(err);
  }
};