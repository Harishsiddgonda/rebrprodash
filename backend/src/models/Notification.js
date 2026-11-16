'use strict';
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  type: { type: String, default: 'general' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
