'use strict';
const mongoose = require('mongoose');

const paymentSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'UPI' },
  paymentDate: { type: String, required: true }
}, { _id: false });

const billSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  flatId: { type: Number, required: true, index: true },
  flatNumber: { type: String, required: true },
  tenantName: { type: String, default: '' },
  month: { type: String, required: true, index: true }, // Format: YYYY-MM
  rent: { type: Number, required: true },
  electricityPrevious: { type: Number, required: true },
  electricityCurrent: { type: Number, required: true },
  electricityUnits: { type: Number, required: true },
  electricityRate: { type: Number, required: true },
  electricityAmount: { type: Number, required: true },
  waterPrevious: { type: Number, required: true },
  waterCurrent: { type: Number, required: true },
  waterUnits: { type: Number, required: true },
  waterRate: { type: Number, required: true },
  waterAmount: { type: Number, required: true },
  garbageAmount: { type: Number, required: true },
  otherCharges: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  status: { type: String, default: 'PENDING', enum: ['PAID', 'PARTIAL', 'PENDING'] },
  paymentMethod: { type: String, default: 'UPI' },
  paymentDate: { type: String, default: null },
  payments: { type: [paymentSubSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.Bill || mongoose.model('Bill', billSchema);
