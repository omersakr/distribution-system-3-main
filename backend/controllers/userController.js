const User = require('../models/User');
const authService = require('../services/authService');

class UserController {
  async getUsers(req, res) {
    try {
      const users = await User.find({ is_deleted: { $ne: true } })
        .select('-password')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        users: users
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المستخدمين',
        error: error.message
      });
    }
  }

  async createUser(req, res) {
    try {
      const { username, password, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'جميع الحقول مطلوبة'
        });
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'اسم المستخدم موجود بالفعل'
        });
      }

      const user = await User.create({
        username,
        password, // Will be hashed by pre-save hook
        role,
        active: true
      });

      // Log user creation
      await authService.logAuditEvent(
        req.user.id,
        'create',
        'User',
        user._id,
        null,
        { username, role },
        req
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء المستخدم بنجاح',
        user: user
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء المستخدم',
        error: error.message
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      const oldValues = user.toJSON();
      
      // Update user
      Object.keys(updates).forEach(key => {
        if (key !== 'password') { // Password updates handled separately
          user[key] = updates[key];
        }
      });

      await user.save();

      // Log user update
      await authService.logAuditEvent(
        req.user.id,
        'update',
        'User',
        id,
        oldValues,
        updates,
        req
      );

      res.json({
        success: true,
        message: 'تم تحديث المستخدم بنجاح',
        user: user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث المستخدم',
        error: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      // Prevent deleting managers
      if (user.role === 'manager') {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن حذف المدير'
        });
      }

      const oldValues = user.toJSON();

      // Soft delete
      user.is_deleted = true;
      user.deleted_at = new Date();
      await user.save();

      // Log user deletion
      await authService.logAuditEvent(
        req.user.id,
        'delete',
        'User',
        id,
        oldValues,
        { deleted: true },
        req
      );

      res.json({
        success: true,
        message: 'تم حذف المستخدم بنجاح'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف المستخدم',
        error: error.message
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      const oldValues = { password_reset: false };
      user.password = newPassword; // Will be hashed by pre-save hook
      await user.save();

      // Log password reset
      await authService.logAuditEvent(
        req.user.id,
        'update',
        'User',
        id,
        oldValues,
        { password_reset: true },
        req
      );

      res.json({
        success: true,
        message: 'تم إعادة تعيين كلمة المرور بنجاح'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إعادة تعيين كلمة المرور',
        error: error.message
      });
    }
  }

  async activateUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      const oldValues = { active: user.active };
      user.active = true;
      await user.save();

      // Log user activation
      await authService.logAuditEvent(
        req.user.id,
        'update',
        'User',
        id,
        oldValues,
        { active: true },
        req
      );

      res.json({
        success: true,
        message: 'تم تفعيل المستخدم بنجاح'
      });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تفعيل المستخدم',
        error: error.message
      });
    }
  }

  async deactivateUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      const oldValues = { active: user.active };
      user.active = false;
      await user.save();

      // Log user deactivation
      await authService.logAuditEvent(
        req.user.id,
        'update',
        'User',
        id,
        oldValues,
        { active: false },
        req
      );

      res.json({
        success: true,
        message: 'تم إلغاء تفعيل المستخدم بنجاح'
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إلغاء تفعيل المستخدم',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();