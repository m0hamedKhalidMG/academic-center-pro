const express = require('express');
const router = express.Router();
const {
  login,
  cardLogin,
  setupAdmin,loginAdmin
} = require('../controllers/auth.controller');

router.route('/login')
  .post(login);
router.post('/admin-login', loginAdmin);
router.route('/card-login')
  .post(cardLogin);
router.post('/setup-admin', setupAdmin);
module.exports = router;