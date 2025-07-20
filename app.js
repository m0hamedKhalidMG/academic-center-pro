// app.js

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./utils/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const assistantRoutes = require('./routes/assistant.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const paymentRoutes = require('./routes/payment.routes');
const testRoutes = require('./routes/test.routes');

const app = express();

// -------------------- Security and Basic Middleware -------------------- //

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from the same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());


// -------------------- CORS Configuration -------------------- //
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://academic-center-pro-pi94.vercel.app' // Production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Accept',
    'Authorization',
    'x-auth-token',
    'Content-Type',
    'X-Requested-With',
    'Range'
  ],
  exposedHeaders: ['Content-Length']
}));

// Handle preflight (OPTIONS) requests for all routes
app.options('*', cors());

// -------------------- Routes -------------------- //
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/assistants', assistantRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/test', testRoutes);

// -------------------- 404 Handler -------------------- //
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

// -------------------- Global Error Handler -------------------- //
app.use(errorHandler);

module.exports = app;
