'use strict';
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  electricityRate: { type: Number, default: 8 },
  waterRate: { type: Number, default: 30 },
  garbageAmount: { type: Number, default: 125 },
  propertyName: { type: String, default: 'RentPro Enterprise Properties' },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  taxRate: { type: Number, default: 0 },
  lateFeePercentage: { type: Number, default: 2 },
  counters: {
    nextPropertyId: { type: Number, default: 1 },
    nextFlatId: { type: Number, default: 1 },
    nextTenantId: { type: Number, default: 1 },
    nextLeaseId: { type: Number, default: 1 },
    nextBillId: { type: Number, default: 1 },
    nextMaintenanceId: { type: Number, default: 1 },
    nextTransactionId: { type: Number, default: 1 },
    nextStaffId: { type: Number, default: 1 },
    nextVendorId: { type: Number, default: 1 },
    nextDocumentId: { type: Number, default: 1 },
    nextNotificationId: { type: Number, default: 1 },
    nextAuditLogId: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
