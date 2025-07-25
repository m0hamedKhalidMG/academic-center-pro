const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  photo: {
    type: String
  },
  phoneNumber: {
    type: String,
    required: true
  },
  parentWhatsAppNumber: {
    type: String,
    required: true
  },
  academicLevel: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D', 'E', 'F']
  },
  groupCode: {
    type: String,
    required: true,
    match: [/^[A-F]-\d+$/, 'Group code must be in format A-1, B-2, etc.']
  },
  attendanceCardCode: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assistant',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', StudentSchema);
