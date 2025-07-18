const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Assistant = require('../models/Assistant');
const {ErrorResponse }= require('../utils/errorHandler');
const config = require('../config/config');

// @desc    Login admin or assistant
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return next(new ErrorResponse('Please provide email, password and role', 400));
  }

  try {
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email }).select('+password');
    } else if (role === 'assistant') {
      user = await Assistant.findOne({ email }).select('+password');
    } else {
      return next(new ErrorResponse('Invalid role specified', 400));
    }

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Skip isActive check for admin users
    if (role !== 'admin' && !user.isActive) {
      return next(new ErrorResponse('Account is deactivated', 401));
    }

    const token = jwt.sign(
      { id: user._id, role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    res.status(200).json({
      success: true,
      token,
      role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login assistant with card ID
// @route   POST /api/v1/auth/card-login
// @access  Public
exports.cardLogin = async (req, res, next) => {
  const { cardId } = req.body;

  if (!cardId) {
    return next(new ErrorResponse('Please provide card ID', 400));
  }

  try {
    const assistant = await Assistant.findOne({ cardId });

    if (!assistant) {
      return next(new ErrorResponse('Invalid card ID', 401));
    }

    if (!assistant.isActive) {
      return next(new ErrorResponse('Account is deactivated', 401));
    }

    const token = jwt.sign(
      { id: assistant._id, role: 'assistant' },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    res.status(200).json({
      success: true,
      token,
      role: 'assistant',
      user: {
        id: assistant._id,
        name: assistant.name,
        email: assistant.email
      }
    });
  } catch (err) {
    next(err);
  }
};

// controllers/auth.controller.js

exports.setupAdmin = async (req, res, next) => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return next(new ErrorResponse('Initial admin already setup', 400));
    }

    const { name, email, password } = req.body;

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role: 'super-admin'
    });

    // Remove password from output
    admin.password = undefined;

    res.status(201).json({
      success: true,
      data: admin,
      message: 'Initial admin account created successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.loginAdmin = async (req, res, next) => {
  const { email, password } = req.body;
  // 1. Validate email and password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  try {
    // 2. Check if admin exists
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 3. Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 4. Check if account is active
    // if (!admin.isActive) {
    //   return next(new ErrorResponse('Account is deactivated', 401));
    // }

    // 5. Create JWT token
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    // 6. Remove password from output
    admin.password = undefined;

    // 7. Send response
    res.status(200).json({
      success: true,
      token,
      data: admin
    });

  } catch (err) {
    next(err);
  }
};
