'use strict';
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  code: { type: String, default: '' },
  name: { type: String, required: true },
  type: { type: String, default: 'Residential Complex' },
  address: { type: String, default: '' },
  manager: { type: String, default: '' },
  buildings: { type: Number, default: 1 },
  floors: { type: Number, default: 1 },
  totalUnits: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Property || mongoose.model('Property', propertySchema);
