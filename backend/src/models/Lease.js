'use strict';
const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  leaseNumber: { type: String, required: true, unique: true },
  propertyId: { type: Number, default: 1, index: true },
  propertyName: { type: String, default: '' },
  flatId: { type: Number, required: true, index: true },
  flatNumber: { type: String, required: true },
  tenantId: { type: Number, required: true, index: true },
  tenantName: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, default: 0 },
  paymentDueDate: { type: Number, default: 5 },
  status: { type: String, default: 'Active' },
  renewalTerms: { type: String, default: '' },
  daysUntilExpiry: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.Lease || mongoose.model('Lease', leaseSchema);
