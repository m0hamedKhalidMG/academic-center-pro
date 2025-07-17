class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR 💥', err);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return res.status(400).json({
      status: 'fail',
      message
    });
  }

  if (err.code === 11000) {
    // Mongoose duplicate key error
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value!`;
    return res.status(400).json({
      status: 'fail',
      message
    });
  }

  if (err.name === 'CastError') {
    // Mongoose bad ObjectId
    const message = `Invalid ${err.path}: ${err.value}`;
    return res.status(400).json({
      status: 'fail',
      message
    });
  }

  if (err.name === 'JsonWebTokenError') {
    // JWT error
    const message = 'Invalid token. Please log in again!';
    return res.status(401).json({
      status: 'fail',
      message
    });
  }

  if (err.name === 'TokenExpiredError') {
    // JWT expired error
    const message = 'Your token has expired! Please log in again.';
    return res.status(401).json({
      status: 'fail',
      message
    });
  }

  // Default error handling
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

module.exports = { ErrorResponse, errorHandler };