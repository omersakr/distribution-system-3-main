const authService = require('../services/authService');
const AuditLog = require('../models/AuditLog');

// Authentication middleware - validates JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'No authentication token provided'
      });
    }

    const user = await authService.validateToken(token);
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    // Log failed authentication attempt (safely)
    try {
      await AuditLog.create({
        user_id: null,
        user_role: 'unknown',
        action_type: 'blocked_attempt',
        entity_type: 'Authentication',
        entity_id: null,
        old_values: null,
        new_values: { error: error.message, endpoint: req.path },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    } catch (auditError) {
      console.error('Failed to log authentication failure:', auditError);
    }

    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
};

// Authorization middleware - checks user roles
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        // Log unauthorized access attempt
        await AuditLog.create({
          user_id: req.user.id,
          user_role: req.user.role,
          action_type: 'blocked_attempt',
          entity_type: 'Authorization',
          entity_id: null,
          old_values: null,
          new_values: {
            required_roles: allowedRoles,
            user_role: req.user.role,
            endpoint: req.path,
            method: req.method
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      return res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

// Audit logging middleware - logs all operations
const auditLogger = (req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json;

  res.json = function (data) {
    // Log the operation after successful completion
    if (req.user && res.statusCode < 400) {
      setImmediate(async () => {
        try {
          const actionType = getActionType(req.method);
          const entityType = getEntityType(req.path);

          if (actionType && entityType) {
            await authService.logAuditEvent(
              req.user.id,
              actionType,
              entityType,
              req.params.id || null,
              req.body.oldValues || null,
              req.body.newValues || data,
              req
            );
          }
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      });
    }

    // Call original json method
    originalJson.call(this, data);
  };

  next();
};

// Helper function to determine action type from HTTP method
const getActionType = (method) => {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return null; // GET requests are not audited
  }
};

// Helper function to extract entity type from URL path
const getEntityType = (path) => {
  const pathSegments = path.split('/').filter(segment => segment);
  if (pathSegments.length >= 2 && pathSegments[0] === 'api') {
    const entityMap = {
      'clients': 'Client',
      'crushers': 'Crusher',
      'suppliers': 'Supplier',
      'employees': 'Employee',
      'deliveries': 'Delivery',
      'administration': 'Administration',
      'projects': 'Project',
      'users': 'User'
    };
    return entityMap[pathSegments[1]] || pathSegments[1];
  }
  return null;
};

// Middleware to check if user can modify historical data
const checkHistoricalDataAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'manager') {
      // Managers can modify anything
      return next();
    }

    if (req.user.role === 'accountant') {
      // Check if this is a price modification on existing data
      const entityId = req.params.id;
      const isPriceModification = req.body.price !== undefined ||
        req.body.material_price !== undefined ||
        req.body.crusher_price !== undefined;

      if (entityId && isPriceModification) {
        // This is an attempt to modify existing price data
        await AuditLog.create({
          user_id: req.user.id,
          user_role: req.user.role,
          action_type: 'blocked_attempt',
          entity_type: getEntityType(req.path),
          entity_id: entityId,
          old_values: null,
          new_values: {
            attempted_modification: req.body,
            reason: 'accountant_cannot_modify_historical_prices'
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });

        return res.status(403).json({
          error: 'Historical data modification denied',
          message: 'Accountants cannot modify prices after creation'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Historical data access check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Internal server error during historical data access check'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  auditLogger,
  checkHistoricalDataAccess
};