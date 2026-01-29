# Enterprise Accountability System - Design Document

## 1. System Architecture Overview

### 1.1 Authentication & Authorization Layer
The system implements a three-tier security architecture:
- **Authentication Layer**: JWT-based token authentication with secure session management
- **Authorization Layer**: Role-Based Access Control (RBAC) with backend enforcement
- **Audit Layer**: Immutable logging of all system operations

### 1.2 User Role Hierarchy
```
Manager (المدير)
├── Full system access
├── Historical data modification
├── Price modification authority
├── Recycle bin management
└── User management

Accountant (المحاسب)
├── Create new records
├── View all data
├── Set prices at creation only
└── Restricted from historical modifications

System Maintenance (صيانة النظام)
├── User account management
├── Password resets
├── Account activation/deactivation
└── No financial data access
```

## 2. Database Design

### 2.1 New Tables

#### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('manager', 'accountant', 'system_maintenance') NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    deleted_at TIMESTAMP NULL,
    is_deleted BOOLEAN DEFAULT false,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_role ENUM('manager', 'accountant', 'system_maintenance') NOT NULL,
    action_type ENUM('create', 'update', 'delete', 'restore', 'permanent_delete', 'blocked_attempt', 'login', 'logout', 'failed_login') NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (timestamp)
);
```

#### Sessions Table
```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    active BOOLEAN DEFAULT true,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_token (token_hash),
    INDEX idx_user_active (user_id, active),
    INDEX idx_expires (expires_at)
);
```

### 2.2 Existing Table Modifications

All existing tables require soft delete fields:
```sql
-- Add to all existing tables
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE clients ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE crushers ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE crushers ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE suppliers ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE suppliers ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE employees ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE deliveries ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE deliveries ADD COLUMN is_deleted BOOLEAN DEFAULT false;
-- Continue for all entities...
```

## 3. Authentication System Design

### 3.1 JWT Token Structure
```javascript
{
  "sub": "user_id",
  "username": "user_username",
  "role": "manager|accountant|system_maintenance",
  "iat": "issued_at_timestamp",
  "exp": "expiration_timestamp",
  "jti": "jwt_id_for_session_tracking"
}
```

### 3.2 Authentication Flow
1. **Login Request**: POST /api/auth/login with username/password
2. **Credential Validation**: Verify against hashed password in database
3. **Token Generation**: Create JWT with user claims and session record
4. **Token Response**: Return JWT token and user role information
5. **Request Authentication**: Validate JWT on every subsequent request
6. **Session Management**: Track active sessions and handle expiration

### 3.3 Password Security
- **Hashing Algorithm**: bcrypt with salt rounds = 12
- **Password Requirements**: Minimum 8 characters, complexity rules
- **Storage**: Only hashed passwords stored, never plain text
- **Reset Mechanism**: Secure password reset with temporary tokens

## 4. Authorization System Design

### 4.1 Middleware Architecture
```javascript
// Authentication Middleware (applies to ALL routes)
const authenticateToken = (req, res, next) => {
  // Validate JWT token
  // Set req.user with user information
  // Log authentication events
};

// Authorization Middleware (role-specific)
const requireRole = (allowedRoles) => (req, res, next) => {
  // Check user role against allowed roles
  // Block unauthorized access
  // Log authorization failures
};

// Audit Middleware (applies to ALL routes)
const auditLogger = (req, res, next) => {
  // Log all system operations
  // Capture before/after states
  // Handle audit failures
};
```

### 4.2 Route Protection Patterns
```javascript
// Manager-only routes
app.use('/api/admin/*', authenticateToken, requireRole(['manager']));
app.put('/api/crushers/:id/price', authenticateToken, requireRole(['manager']));
app.put('/api/suppliers/:id/materials/:materialId/price', authenticateToken, requireRole(['manager']));

// Manager + Accountant routes
app.get('/api/*', authenticateToken, requireRole(['manager', 'accountant']));
app.post('/api/*', authenticateToken, requireRole(['manager', 'accountant']));

// System Maintenance routes
app.use('/api/users/*', authenticateToken, requireRole(['system_maintenance', 'manager']));

// Blocked routes for System Maintenance
app.use('/api/deliveries/*', authenticateToken, requireRole(['manager', 'accountant']));
app.use('/api/reports/*', authenticateToken, requireRole(['manager', 'accountant']));
```

## 5. Audit Logging System Design

### 5.1 Audit Event Types
- **CRUD Operations**: create, update, delete, restore, permanent_delete
- **Security Events**: login, logout, failed_login, blocked_attempt
- **Financial Events**: price_change, payment_modification, adjustment
- **Administrative Events**: user_creation, role_assignment, password_reset

### 5.2 Audit Data Capture
```javascript
const auditLog = {
  captureCreate: (user, entityType, entityId, newValues) => {
    return {
      user_id: user.id,
      user_role: user.role,
      action_type: 'create',
      entity_type: entityType,
      entity_id: entityId,
      old_values: null,
      new_values: newValues,
      timestamp: new Date(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };
  },
  
  captureUpdate: (user, entityType, entityId, oldValues, newValues) => {
    return {
      user_id: user.id,
      user_role: user.role,
      action_type: 'update',
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      timestamp: new Date(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };
  }
  // Additional capture methods...
};
```

### 5.3 Audit Log Immutability
- **No UPDATE operations** allowed on audit_logs table
- **No DELETE operations** allowed on audit_logs table
- **Database triggers** prevent unauthorized modifications
- **Separate audit database** for enhanced security (optional)

## 6. Soft Delete System Design

### 6.1 Soft Delete Implementation
```javascript
// Base soft delete functionality
const softDelete = {
  delete: async (model, id, userId) => {
    const record = await model.findById(id);
    if (!record || record.is_deleted) {
      throw new Error('Record not found or already deleted');
    }
    
    // Capture old state for audit
    const oldValues = record.toJSON();
    
    // Perform soft delete
    record.deleted_at = new Date();
    record.is_deleted = true;
    await record.save();
    
    // Log the deletion
    await auditLog.captureDelete(userId, model.name, id, oldValues);
    
    return record;
  },
  
  restore: async (model, id, userId) => {
    // Only managers can restore
    const record = await model.findById(id);
    if (!record || !record.is_deleted) {
      throw new Error('Record not found or not deleted');
    }
    
    // Capture state for audit
    const oldValues = record.toJSON();
    
    // Restore record
    record.deleted_at = null;
    record.is_deleted = false;
    await record.save();
    
    // Log the restoration
    await auditLog.captureRestore(userId, model.name, id, oldValues);
    
    return record;
  }
};
```

### 6.2 Query Modifications
All existing queries must exclude soft-deleted records:
```javascript
// Default scope for all models
const defaultScope = {
  where: {
    is_deleted: false
  }
};

// Recycle bin scope
const deletedScope = {
  where: {
    is_deleted: true
  }
};
```

## 7. Frontend Integration Design

### 7.1 Authentication UI Components
- **Login Page**: Username/password form with validation
- **Session Management**: Auto-logout on token expiration
- **Role-Based UI**: Show/hide features based on user role
- **Unauthorized Access**: Redirect to login on 401/403 responses

### 7.2 Role-Based Feature Visibility
```javascript
// Frontend role checking
const userPermissions = {
  canEditPrices: (user) => user.role === 'manager',
  canDeleteRecords: (user) => user.role === 'manager',
  canAccessRecycleBin: (user) => ['manager', 'accountant'].includes(user.role),
  canRestoreRecords: (user) => user.role === 'manager',
  canManageUsers: (user) => ['manager', 'system_maintenance'].includes(user.role),
  canAccessFinancialData: (user) => ['manager', 'accountant'].includes(user.role)
};
```

### 7.3 Audit Trail UI
- **Audit Log Viewer**: Read-only table of all system activities
- **Filtering Options**: By user, date range, entity type, action type
- **Export Functionality**: CSV/PDF export for compliance reporting
- **Real-time Updates**: Live audit log updates for administrators

## 8. API Design Changes

### 8.1 Authentication Endpoints
```javascript
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET /api/auth/me
POST /api/auth/change-password
```

### 8.2 User Management Endpoints
```javascript
GET /api/users (System Maintenance + Manager only)
POST /api/users (System Maintenance + Manager only)
PUT /api/users/:id (System Maintenance + Manager only)
DELETE /api/users/:id (Manager only - soft delete)
POST /api/users/:id/reset-password (System Maintenance + Manager only)
PUT /api/users/:id/activate (System Maintenance + Manager only)
PUT /api/users/:id/deactivate (System Maintenance + Manager only)
```

### 8.3 Audit Log Endpoints
```javascript
GET /api/audit-logs (Manager only)
GET /api/audit-logs/export (Manager only)
GET /api/audit-logs/user/:userId (Manager only)
GET /api/audit-logs/entity/:entityType/:entityId (Manager only)
```

### 8.4 Recycle Bin Endpoints
```javascript
GET /api/recycle-bin (Manager + Accountant)
POST /api/recycle-bin/:entityType/:id/restore (Manager only)
DELETE /api/recycle-bin/:entityType/:id/permanent (Manager only)
```

## 9. Security Considerations

### 9.1 Backend Security Enforcement
- **Service Layer Validation**: All business rules enforced at service level
- **Database Constraints**: Foreign keys and check constraints for data integrity
- **Input Validation**: Comprehensive validation of all user inputs
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Prevention**: Output encoding and CSP headers

### 9.2 Session Security
- **Token Expiration**: JWT tokens expire after 8 hours
- **Refresh Mechanism**: Secure token refresh without re-authentication
- **Session Invalidation**: Logout invalidates all user sessions
- **Concurrent Sessions**: Limit concurrent sessions per user
- **IP Validation**: Optional IP address validation for sessions

### 9.3 Audit Security
- **Tamper Detection**: Hash chains for audit log integrity
- **Backup Strategy**: Regular encrypted backups of audit logs
- **Access Logging**: Log all access to audit logs themselves
- **Retention Policy**: Indefinite retention with archival strategy

## 10. Performance Considerations

### 10.1 Database Optimization
- **Indexing Strategy**: Proper indexes on soft delete flags and audit tables
- **Query Optimization**: Efficient queries for filtered data sets
- **Connection Pooling**: Optimized database connection management
- **Caching Strategy**: Redis caching for user sessions and permissions

### 10.2 Audit Log Performance
- **Asynchronous Logging**: Non-blocking audit log writes
- **Batch Processing**: Batch audit log inserts for high-volume operations
- **Partitioning**: Table partitioning for large audit log tables
- **Archival Strategy**: Move old audit logs to archive tables

## 11. Migration Strategy

### 11.1 Database Migration Plan
1. **Phase 1**: Create new tables (users, audit_logs, user_sessions)
2. **Phase 2**: Add soft delete columns to existing tables
3. **Phase 3**: Create default admin user and initial roles
4. **Phase 4**: Update existing queries to exclude soft-deleted records
5. **Phase 5**: Enable authentication middleware on all routes

### 11.2 Data Migration
- **User Creation**: Create initial admin user during migration
- **Role Assignment**: Assign default roles to existing system access
- **Audit Baseline**: Create initial audit entries for existing data
- **Soft Delete Initialization**: Set is_deleted = false for all existing records

### 11.3 Rollback Strategy
- **Database Rollback**: Reversible migrations for all schema changes
- **Feature Flags**: Ability to disable authentication system if needed
- **Data Backup**: Full system backup before migration
- **Testing Strategy**: Comprehensive testing in staging environment

## 12. Testing Strategy

### 12.1 Unit Tests
- **Authentication Logic**: Token generation, validation, expiration
- **Authorization Logic**: Role-based access control functions
- **Audit Logging**: Audit log creation and immutability
- **Soft Delete**: Soft delete and restore functionality

### 12.2 Integration Tests
- **API Security**: All endpoints require authentication
- **Role Enforcement**: Unauthorized access returns 403
- **Audit Trail**: All operations generate audit logs
- **Data Integrity**: Soft-deleted records excluded from calculations

### 12.3 Security Tests
- **Penetration Testing**: Attempt to bypass authentication/authorization
- **SQL Injection**: Test all inputs for SQL injection vulnerabilities
- **XSS Testing**: Test all outputs for XSS vulnerabilities
- **Session Security**: Test session hijacking and fixation attacks

## 13. Monitoring and Alerting

### 13.1 Security Monitoring
- **Failed Login Attempts**: Alert on multiple failed login attempts
- **Unauthorized Access**: Alert on 403 responses and blocked attempts
- **Audit Log Failures**: Alert on audit logging failures
- **Session Anomalies**: Alert on unusual session patterns

### 13.2 Performance Monitoring
- **Authentication Latency**: Monitor login/token validation performance
- **Audit Log Performance**: Monitor audit logging impact on system performance
- **Database Performance**: Monitor query performance with soft delete filters
- **Session Management**: Monitor session creation/cleanup performance

## 14. Compliance and Documentation

### 14.1 Compliance Requirements
- **Audit Trail Completeness**: Every system operation must be logged
- **Data Retention**: Audit logs retained indefinitely
- **Access Control**: Role-based access strictly enforced
- **Data Integrity**: Soft-deleted records don't affect financial calculations

### 14.2 Documentation Requirements
- **User Manual**: Role-specific user guides
- **Administrator Guide**: System administration and user management
- **Audit Guide**: Audit log interpretation and compliance reporting
- **Security Guide**: Security best practices and incident response

## 15. Correctness Properties

### Property 1: Authentication Completeness
**Property**: Every system request must be authenticated
**Validation**: No API endpoint accepts requests without valid JWT token
**Test Strategy**: Attempt to access all endpoints without authentication

### Property 2: Authorization Enforcement
**Property**: Users can only perform actions authorized for their role
**Validation**: Role restrictions enforced at backend service level
**Test Strategy**: Attempt unauthorized actions for each role

### Property 3: Audit Log Immutability
**Property**: Audit logs cannot be modified or deleted after creation
**Validation**: No UPDATE or DELETE operations succeed on audit_logs table
**Test Strategy**: Attempt to modify audit logs through all possible vectors

### Property 4: Soft Delete Integrity
**Property**: Soft-deleted records don't affect financial calculations
**Validation**: Financial summaries exclude soft-deleted records
**Test Strategy**: Compare calculations before/after soft delete operations

### Property 5: Historical Data Protection
**Property**: Accountants cannot modify historical financial data
**Validation**: Price modification attempts by accountants are blocked
**Test Strategy**: Attempt price modifications as accountant role

### Property 6: Complete Audit Trail
**Property**: Every system operation generates an audit log entry
**Validation**: All CRUD operations have corresponding audit entries
**Test Strategy**: Verify audit log completeness for all operations

### Property 7: Session Security
**Property**: Expired or invalid sessions cannot access system resources
**Validation**: Token expiration and invalidation properly enforced
**Test Strategy**: Use expired/invalid tokens to access protected resources

### Property 8: Role Isolation
**Property**: System Maintenance cannot access financial data
**Validation**: Financial endpoints return 403 for System Maintenance role
**Test Strategy**: Attempt financial data access as System Maintenance user

## 16. Implementation Priority

### Phase 1: Core Authentication (High Priority)
- User model and authentication system
- JWT token generation and validation
- Login/logout functionality
- Basic session management

### Phase 2: Authorization Framework (High Priority)
- Role-based access control middleware
- Route protection implementation
- Permission checking at service level
- Basic audit logging

### Phase 3: Soft Delete System (Medium Priority)
- Soft delete implementation across all models
- Query modifications to exclude deleted records
- Recycle bin functionality
- Restore and permanent delete operations

### Phase 4: Advanced Features (Medium Priority)
- Comprehensive audit logging
- Audit log viewer UI
- User management interface
- Advanced session management

### Phase 5: Security Hardening (Low Priority)
- Security monitoring and alerting
- Advanced audit features
- Performance optimization
- Compliance reporting

This design provides a comprehensive technical architecture for implementing enterprise-grade accountability while maintaining strict adherence to the additive-only constraint and preserving all existing business logic.