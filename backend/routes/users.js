const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireRole } = require('../middleware/auth');

// All user management routes require System Maintenance role only
router.use(requireRole(['system_maintenance']));

// Get all users
router.get('/users', userController.getUsers);

// Create new user
router.post('/users', userController.createUser);

// Update user
router.put('/users/:id', userController.updateUser);

// Delete user (soft delete)
router.delete('/users/:id', userController.deleteUser);

// Reset user password
router.post('/users/:id/reset-password', userController.resetPassword);

// Activate user
router.put('/users/:id/activate', userController.activateUser);

// Deactivate user
router.put('/users/:id/deactivate', userController.deactivateUser);

module.exports = router;