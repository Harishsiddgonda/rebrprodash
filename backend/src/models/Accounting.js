'use strict';
const mongoose = require('mongoose');

const accountingSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  type: { type: String, required: true, enum: ['Income', 'Expense', 'Liability'] },
  category: { type: String, required: true },
  propertyId: { type: Number, default: 1 },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  vendor: { type: String, default: '' },
  paymentMethod: { type: String, default: 'Bank Transfer' },
  status: { type: String, default: 'Cleared' }
}, { timestamps: true });

module.exports = mongoose.models.Accounting || mongoose.model('Accounting', accountingSchema);
