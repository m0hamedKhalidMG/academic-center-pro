// routes/group.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup
} = require('../controllers/group.controller');

// Public routes (if needed)
// router.get('/', getGroups);
// router.get('/:id', getGroup);

// Protected routes
router.post('/',
  protect,
  authorize('admin', 'assistant'),
  createGroup
);

router.get('/',
  protect,
  getGroups
);

router.get('/:id',
  protect,
  getGroup
);

router.put('/:id',
  protect,
  authorize('admin', 'assistant'),
  updateGroup
);

router.delete('/:id',
  protect,
  authorize('admin', 'assistant'),
  deleteGroup
);

module.exports = router;
