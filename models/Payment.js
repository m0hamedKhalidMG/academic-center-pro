const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  method: {
    type: String,
    enum: ['cash', 'transfer', 'card'],
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assistant',
    required: true
  }
}, { timestamps: true });

PaymentSchema.index({ student: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payment', PaymentSchema);