const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// All user management routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/', getAllUsers);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

module.exports = router;
