'use strict';
const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  designation: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  assignedProperty: { type: String, default: 'All Properties' },
  status: { type: String, default: 'Active' },
  role: { type: String, default: 'Staff' }
}, { timestamps: true });

module.exports = mongoose.models.Staff || mongoose.model('Staff', staffSchema);
