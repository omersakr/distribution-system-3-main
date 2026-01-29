const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for failed login attempts
  },
  user_role: {
    type: String,
    required: true,
    enum: ['manager', 'accountant', 'system_maintenance', 'unknown']
  },
  action_type: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'restore', 'permanent_delete',
      'blocked_attempt', 'login', 'logout', 'failed_login',
      'price_change', 'payment_modification', 'adjustment'
    ]
  },
  entity_type: {
    type: String,
    required: true
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  old_values: {
    type: mongoose.Schema.Types.Mixed
  },
  new_values: {
    type: mongoose.Schema.Types.Mixed
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: false // We use our own timestamp field
});

// Prevent updates and deletes on audit logs
auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

auditLogSchema.pre('deleteMany', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

// Indexes for performance
auditLogSchema.index({ user_id: 1, timestamp: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action_type: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);