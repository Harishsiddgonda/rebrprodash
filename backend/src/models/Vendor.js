'use strict';
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: { type: String, default: 'General Maintenance' },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  rating: { type: Number, default: 4.5 },
  status: { type: String, default: 'Active' },
  contractUntil: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
