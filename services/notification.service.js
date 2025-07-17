const axios = require('axios');
const Student = require('../models/Student');
const {ErrorResponse} = require('../utils/errorHandler');
const twilioService = require('./twilio.service');
const config = require('../config/config')
// WhatsApp API integration (using Ultramsg as example)

// @desc    Send absence notification to parent
// @param   {Object} student - Student object
// @return  {Object} { success: boolean, message?: string }
exports.sendAbsenceNotification = async (student) => {
  const message = `Dear Parent, your child ${student.fullName} did not attend their scheduled lesson today. Please contact the academy for details.`;
  
  // Remove any non-digit characters from phone number
  const phone = student.parentWhatsAppNumber.replace(/\D/g, '');
  
  return await twilioService.sendWhatsAppMessage(phone, message);
};

exports.sendPaymentReminder = async (student, month, year) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  const message = `Dear Parent, this is a reminder that the ${monthNames[month-1]} ${year} tuition fee for ${student.fullName} is pending. Please make the payment at your earliest convenience.`;
  
  const phone = student.parentWhatsAppNumber.replace(/\D/g, '');
  return await twilioService.sendWhatsAppMessage(phone, message);
};

// @desc    Send suspension notice to parent
// @param   {Object} student - Student object
// @param   {Object} suspension - Suspension object
// @return  {Object} { success: boolean, message?: string }
// exports.sendSuspensionNotice = async (student, suspension) => {
//   try {
//     let message = `Dear Parent, your child ${student.fullName} has been ${suspension.type === 'permanent' ? 'permanently' : 'temporarily'} suspended from the academy.`;

//     if (suspension.type === 'temporary' && suspension.endDate) {
//       message += ` The suspension will be lifted on ${suspension.endDate.toDateString()}.`;
//     }

//     if (suspension.notes) {
//       message += ` Notes: ${suspension.notes}`;
//     }

//     const response = await whatsappApi.post('/messages', {
//       to: student.parentWhatsAppNumber,
//       body: message,
//       token: config.whatsappApiToken
//     });

//     return { success: true };
//   } catch (err) {
//     console.error('Error sending suspension notice:', err.message);
//     return { success: false, message: err.message };
//   }
// };

// // @desc    Send payment confirmation to parent
// // @param   {Object} student - Student object
// // @param   {Object} payment - Payment object
// // @return  {Object} { success: boolean, message?: string }
// exports.sendPaymentConfirmation = async (student, payment) => {
//   try {
//     const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
//     const monthName = monthNames[payment.month - 1];

//     const message = `Dear Parent, we have received the payment of ${payment.amount} for ${monthName} ${payment.year} for ${student.fullName}. Thank you!`;

//     const response = await whatsappApi.post('/messages', {
//       to: student.parentWhatsAppNumber,
//       body: message,
//       token: config.whatsappApiToken
//     });

//     return { success: true };
//   } catch (err) {
//     console.error('Error sending payment confirmation:', err.message);
//     return { success: false, message: err.message };
//   }
// };