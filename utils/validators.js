const { body, param, query } = require('express-validator');
const { ErrorResponse } = require('./errorHandler');

// Common validation rules
const studentValidationRules = () => {
  return [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('photo').notEmpty().withMessage('Photo is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('parentWhatsAppNumber').notEmpty().withMessage('Parent WhatsApp number is required'),
    body('academicLevel').notEmpty().withMessage('Academic level is required'),
    body('groupCode').matches(/^[A-F]-\d+$/).withMessage('Group code must be in format A-1, B-2, etc.'),
    body('attendanceCardCode').notEmpty().withMessage('Attendance card code is required')
  ];
};

const paymentValidationRules = () => {
  return [
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be valid'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('method').isIn(['cash', 'transfer', 'card']).withMessage('Invalid payment method')
  ];
};

const attendanceValidationRules = () => {
  return [
    body('cardCode').notEmpty().withMessage('Card code is required')
  ];
};

const adminValidationRules = () => {
  return [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ];
};

const assistantValidationRules = () => {
  return [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

  throw new ErrorResponse('Validation failed', 422, {
    errors: extractedErrors
  });
};

module.exports = {
  studentValidationRules,
  paymentValidationRules,
  attendanceValidationRules,
  adminValidationRules,
  assistantValidationRules,
  validate
};