'use strict';
const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  ticketNumber: { type: String, required: true, unique: true },
  propertyId: { type: Number, default: 1 },
  propertyName: { type: String, default: '' },
  flatId: { type: Number, default: null },
  flatNumber: { type: String, default: '' },
  tenantName: { type: String, default: '' },
  title: { type: String, required: true },
  category: { type: String, default: 'General' },
  priority: { type: String, default: 'Medium', enum: ['Low', 'Medium', 'High', 'Urgent'] },
  status: { type: String, default: 'Open', enum: ['Open', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'] },
  assignedTo: { type: String, default: 'Unassigned' },
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  completedAt: { type: String, default: null },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Maintenance || mongoose.model('Maintenance', maintenanceSchema);
