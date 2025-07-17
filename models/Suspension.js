const mongoose = require('mongoose');

const SuspensionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  type: {
    type: String,
    enum: ['temporary', 'permanent'],
    required: true
  },
  notes: String,
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: Date,
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assistant',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Suspension', SuspensionSchema);