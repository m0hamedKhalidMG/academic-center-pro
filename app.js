const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const {errorHandler} = require('./utils/errorHandler');
const groupRoutes = require('./routes/group.routes');

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const assistantRoutes = require('./routes/assistant.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const paymentRoutes = require('./routes/payment.routes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour!'
// });
// app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection

// // Data sanitization against XSS
// app.use(xss());

// // Prevent parameter pollution
// app.use(hpp());

// Enable CORS
const allowedOrigins = [
  "https://academic-center-sys.vercel.app",
  "http://54.82.231.40",
  "http://localhost:3000"
];
app.use(cors({
  origin: function (origin, callback) {
    // السماح لو الريكويست جاي من قائمة origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(function (req, res, next) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, PATCH, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Expose-Headers", "Content-Length");
  res.header(
    "Access-Control-Allow-Headers",
    "Accept, Authorization, x-auth-token, Content-Type, X-Requested-With, Range"
  );

  // ✅ رد على preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});
// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/assistants', assistantRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payments', paymentRoutes);
const testRoutes = require('./routes/test.routes');
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/test', testRoutes);
// Handle unhandled routes
// At the VERY END of your middleware chain (after all other routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 404,
      message: 'Resource not found',
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      method: req.method
    }
  });

});
// Global error handler
app.use(errorHandler);

module.exports = app
