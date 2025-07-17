require('dotenv').config();

const config = {
  // Server Configuration
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,

  // Database
  mongoURI: process.env.MONGO_URI || 'mongodb+srv://mhamedsoft777:777888@cluster0.59gb7.mongodb.net/academic_center',
  mongoOptions: {
    useNewUrlParser: true,
  },

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_super_secret_key_here',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  passwordResetExpire: 10 * 60 * 1000, // 10 minutes

  // Email Service (for future use)
  email: {
    service: process.env.EMAIL_SERVICE || 'Gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE || false,
    user: process.env.EMAIL_USER || 'your_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_email_password'
  },

  // WhatsApp Notifications
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com/instance12345',
    apiToken: process.env.WHATSAPP_API_TOKEN || 'your_ultramsg_token',
    fromNumber: process.env.WHATSAPP_FROM_NUMBER || '1234567890'
  },

  // Payment Configuration
  payments: {
    defaultMonthlyFee: process.env.DEFAULT_MONTHLY_FEE || 500,
    lateFeeDays: 10,
    lateFeeAmount: 50
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // CORS Configuration
  corsOptions: {
    origin: process.env.CORS_ORIGIN || true, // or specify domains ['http://localhost:3000']
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'combined.log',
    errorFile: process.env.ERROR_LOG_FILE || 'error.log'
  }
};

// Validate required configurations
const requiredConfigs = ['mongoURI', 'jwtSecret'];
requiredConfigs.forEach(key => {
  if (!config[key]) {
    throw new Error(`Missing required config: ${key}`);
  }
});

module.exports = config;