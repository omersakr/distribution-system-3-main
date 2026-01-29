const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/login', authController.login);

// Temporary route to create default users (remove in production)
router.post('/create-users', async (req, res) => {
  try {
    const authService = require('../services/authService');
    const result = await authService.createDefaultUsers();
    res.json({ success: true, message: 'Default users created successfully', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected routes (authentication required)
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.me);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/refresh', authenticateToken, authController.refresh);

module.exports = router;