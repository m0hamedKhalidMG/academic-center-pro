// services/twilio.service.js
const twilio = require('twilio');
const config = require('../config/config');
require('dotenv').config();

class TwilioService {
  constructor() {
    this.client = twilio(
'AC44c851b63132cb4633c9249562d8de7d',
'c943695839b9453a4cac09d9f0b1f620'    );
  }

  async sendWhatsAppMessage(to, body) {
    try {
      const response = await this.client.messages.create({
         from: 'whatsapp:+14155238886',
        contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
        contentVariables: '{"1":"12/1","2":"3pm"}',
        to: 'whatsapp:+201554267344'
      });
      
      return { success: true, sid: response.sid };
    } catch (error) {
      console.error('Twilio error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TwilioService();