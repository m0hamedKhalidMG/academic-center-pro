const {ErrorResponse} = require('../utils/errorHandler');

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};