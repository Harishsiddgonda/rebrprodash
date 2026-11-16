'use strict';
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  title: { type: String, required: true },
  category: { type: String, default: 'General' },
  fileSize: { type: String, default: '0 KB' },
  uploadedAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  format: { type: String, default: 'PDF' },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Document || mongoose.model('Document', documentSchema);
