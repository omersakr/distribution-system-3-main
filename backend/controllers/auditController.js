const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

class AuditController {
  async getAuditLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        action_type,
        entity_type,
        user_id,
        date_from,
        date_to
      } = req.query;

      // Build filter query
      const filter = {};
      
      if (action_type) filter.action_type = action_type;
      if (entity_type) filter.entity_type = entity_type;
      if (user_id) filter.user_id = user_id;
      
      if (date_from || date_to) {
        filter.timestamp = {};
        if (date_from) filter.timestamp.$gte = new Date(date_from);
        if (date_to) filter.timestamp.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await AuditLog.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      // Get audit logs with pagination
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user_id', 'username role');

      res.json({
        success: true,
        logs: logs,
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          total: total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب سجل العمليات',
        error: error.message
      });
    }
  }

  async exportAuditLogs(req, res) {
    try {
      const {
        action_type,
        entity_type,
        user_id,
        date_from,
        date_to,
        format = 'csv'
      } = req.query;

      // Build filter query
      const filter = {};
      
      if (action_type) filter.action_type = action_type;
      if (entity_type) filter.entity_type = entity_type;
      if (user_id) filter.user_id = user_id;
      
      if (date_from || date_to) {
        filter.timestamp = {};
        if (date_from) filter.timestamp.$gte = new Date(date_from);
        if (date_to) filter.timestamp.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Get all matching logs (limit to 10000 for performance)
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(10000)
        .populate('user_id', 'username role');

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'التاريخ,المستخدم,الدور,نوع العملية,نوع الكيان,معرف الكيان,عنوان IP\n';
        const csvRows = logs.map(log => {
          const timestamp = log.timestamp.toLocaleString('ar-EG');
          const username = log.user_id ? log.user_id.username : 'غير معروف';
          const role = log.user_role;
          const actionType = log.action_type;
          const entityType = log.entity_type;
          const entityId = log.entity_id || '';
          const ipAddress = log.ip_address || '';
          
          return `"${timestamp}","${username}","${role}","${actionType}","${entityType}","${entityId}","${ipAddress}"`;
        }).join('\n');

        const csv = csvHeader + csvRows;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send('\ufeff' + csv); // Add BOM for proper Arabic display in Excel
      } else {
        res.json({
          success: true,
          logs: logs,
          total: logs.length
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تصدير سجل العمليات',
        error: error.message
      });
    }
  }

  async getAuditLogsByUser(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await AuditLog.countDocuments({ user_id: userId });
      const totalPages = Math.ceil(total / parseInt(limit));

      const logs = await AuditLog.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user_id', 'username role');

      res.json({
        success: true,
        logs: logs,
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          total: total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب سجل عمليات المستخدم',
        error: error.message
      });
    }
  }

  async getAuditLogsByEntity(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = { entity_type: entityType, entity_id: entityId };
      const total = await AuditLog.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user_id', 'username role');

      res.json({
        success: true,
        logs: logs,
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          total: total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب سجل عمليات الكيان',
        error: error.message
      });
    }
  }
}

module.exports = new AuditController();