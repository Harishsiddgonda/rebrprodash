'use strict';
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  user: { type: String, default: 'System Admin' },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  ip: { type: String, default: '127.0.0.1' }
}, { timestamps: true });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
