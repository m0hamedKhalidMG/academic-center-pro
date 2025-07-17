const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Admin = require('../models/Admin');
const Assistant = require('../models/Assistant');
const {ErrorResponse} = require('../utils/errorHandler');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === 'assistant') {
      user = await Assistant.findById(decoded.id);
    }

    if (!user) {
      return next(new ErrorResponse('No user found with this id', 404));
    }

    req.user = user;
    req.role = decoded.role;
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.role} is not authorized to access this route....`,
          403
        )
      );
    }
    next();
  };
};