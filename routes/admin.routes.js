const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createAssistant,
  getAssistants,
  updateAssistant,
  deleteAssistant,
  resetAssistantPassword
} = require('../controllers/admin.controller');

// All routes protected and only accessible by admin
router.use(protect);
router.use(authorize('admin'));

router.route('/assistants')
  .post(createAssistant)
  .get(getAssistants);

router.route('/assistants/:id')
  .put(updateAssistant)
  .delete(deleteAssistant);

router.route('/assistants/:id/reset-password')
  .put(resetAssistantPassword);

module.exports = router;