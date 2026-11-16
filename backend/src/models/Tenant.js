'use strict';
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  flatId: { type: Number, default: null, index: true },
  flatNumber: { type: String, default: null },
  propertyId: { type: Number, default: 1, index: true },
  status: { type: String, default: 'Active Resident' },
  emergencyContact: { type: String, default: '' },
  vehicle: { type: String, default: '' },
  kycStatus: { type: String, default: 'Pending' },
  registrationDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
