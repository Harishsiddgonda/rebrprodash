'use strict';
const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  flatNumber: { type: String, required: true, unique: true, index: true, trim: true },
  tenantName: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  monthlyRent: { type: Number, required: true, min: 0 },
  electricityReading: { type: Number, default: 0, min: 0 },
  waterReading: { type: Number, default: 0, min: 0 },
  occupied: { type: Boolean, default: false },
  propertyId: { type: Number, default: 1, index: true },
  type: { type: String, default: '2BHK Apartment' },
  floor: { type: Number, default: 1 },
  status: { type: String, default: 'Vacant Ready' },
  securityDeposit: { type: Number, default: 0 },
  bedrooms: { type: Number, default: 2 },
  bathrooms: { type: Number, default: 2 },
  squareFeet: { type: Number, default: 1000 }
}, { timestamps: true });

module.exports = mongoose.models.Flat || mongoose.model('Flat', flatSchema);
