const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
  getStudentByCardCode,
  deleteStudent   
} = require('../controllers/student.controller');

// All routes protected and only accessible by assistants
router.use(protect);
router.use(authorize('assistant','admin'));
router.get('/scan/:cardCode', getStudentByCardCode);
router.route('/')
  .post(createStudent)
  .get(getStudents);

router.route('/:id')
  .get(getStudent)
  .put(updateStudent)
  .delete(deactivateStudent);
// 🔥 Permanently delete a student and all related data (admin only)
router.delete('/:id/permanent', authorize('admin','assistant'), deleteStudent);
module.exports = router;
