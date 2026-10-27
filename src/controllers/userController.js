const User = require('../models/User');

/**
 * List all users.
 * GET /users
 * Protected: Admin only
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user role.
 * PUT /users/:id/role
 * Protected: Admin only
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['admin', 'contributor'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Allowed values: admin, contributor',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id '${req.params.id}'`,
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated to '${role}'`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a user.
 * DELETE /users/:id
 * Protected: Admin only
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Admin cannot delete their own account.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id '${req.params.id}'`,
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'User removed successfully',
      data: { id: req.params.id },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
};
