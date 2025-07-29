// routes/test.routes.js
const express = require('express');
const router = express.Router();

router.get('/test-whatsapp', async (req, res) => {
  const result = await twilioService.sendWhatsAppMessage(
    '201019648129', // Test Saudi number (replace with your WhatsApp number)
    'This is a test message from Academic Center'
  );
  
  res.json(result);
});

module.exports = router;
