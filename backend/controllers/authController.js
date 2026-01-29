const authService = require('../services/authService');

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Username and password are required'
        });
      }

      const result = await authService.login(username, password, req);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        error: 'Login failed',
        message: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      const token = req.token;
      const result = await authService.logout(token, req);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        error: 'Logout failed',
        message: error.message
      });
    }
  }

  async me(req, res) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get user info',
        message: error.message
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Missing passwords',
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'New password must be at least 8 characters long'
        });
      }

      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        req
      );
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        error: 'Password change failed',
        message: error.message
      });
    }
  }

  async refresh(req, res) {
    try {
      const user = await authService.validateToken(req.token);
      const newToken = authService.generateToken(user);
      
      res.json({
        success: true,
        data: {
          token: newToken,
          user: user
        }
      });
    } catch (error) {
      res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();