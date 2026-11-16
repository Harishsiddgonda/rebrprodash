'use strict';
const dns = require('dns');
try {
  // Ensure Node DNS uses public resolvers for reliable Atlas SRV lookups on mobile hotspots & VPNs
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}
const mongoose = require('mongoose');
const models = require('./models');

let isMongoActive = false;
let connectionAttempted = false;

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URI || '';
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

function getConnectionInfo() {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const state = readyStates[mongoose.connection.readyState] || 'unknown';
  return {
    configured: Boolean(getMongoUri()),
    connected: isConnected(),
    state,
    host: mongoose.connection.host || null,
    port: mongoose.connection.port || null,
    database: mongoose.connection.name || null,
    models: Object.keys(models)
  };
}

async function connectDB() {
  const uri = getMongoUri();
  connectionAttempted = true;

  if (!uri) {
    console.log('[RentPro Database] MONGODB_URI not set. Running with persistent local JSON store.');
    isMongoActive = false;
    return null;
  }

  try {
    console.log('[RentPro Database] Connecting to MongoDB...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isMongoActive = true;
    console.log(`[RentPro Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[RentPro Database] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[RentPro Database] MongoDB disconnected.');
      isMongoActive = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[RentPro Database] MongoDB reconnected.');
      isMongoActive = true;
    });

    return conn;
  } catch (err) {
    console.warn(`[RentPro Database] MongoDB connection failed: ${err.message}. Falling back to persistent local JSON store.`);
    isMongoActive = false;
    return null;
  }
}

async function syncToMongo(state) {
  if (!isConnected()) return false;

  try {
    const operations = [
      models.Setting.findOneAndUpdate(
        { key: 'global' },
        {
          key: 'global',
          ...state.settings,
          counters: {
            nextPropertyId: state.nextPropertyId,
            nextFlatId: state.nextFlatId,
            nextTenantId: state.nextTenantId,
            nextLeaseId: state.nextLeaseId,
            nextBillId: state.nextBillId,
            nextMaintenanceId: state.nextMaintenanceId,
            nextTransactionId: state.nextTransactionId,
            nextStaffId: state.nextStaffId,
            nextVendorId: state.nextVendorId,
            nextDocumentId: state.nextDocumentId,
            nextNotificationId: state.nextNotificationId,
            nextAuditLogId: state.nextAuditLogId
          }
        },
        { upsert: true, new: true }
      )
    ];

    const entityMap = [
      ['properties', models.Property],
      ['flats', models.Flat],
      ['tenants', models.Tenant],
      ['leases', models.Lease],
      ['bills', models.Bill],
      ['maintenance', models.Maintenance],
      ['accounting', models.Accounting],
      ['staff', models.Staff],
      ['vendors', models.Vendor],
      ['documents', models.Document],
      ['notifications', models.Notification],
      ['auditLogs', models.AuditLog]
    ];

    for (const [key, Model] of entityMap) {
      const items = Array.isArray(state[key]) ? state[key] : [];
      if (items.length > 0) {
        const bulkOps = items.map(item => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: item },
            upsert: true
          }
        }));
        operations.push(Model.bulkWrite(bulkOps));
      }
    }

    await Promise.all(operations);
    return true;
  } catch (error) {
    console.error('[RentPro Database] Error syncing state to MongoDB:', error.message);
    return false;
  }
}

async function loadFromMongo(targetState) {
  if (!isConnected()) return false;

  try {
    const [
      settingDoc,
      properties,
      flats,
      tenants,
      leases,
      bills,
      maintenance,
      accounting,
      staff,
      vendors,
      documents,
      notifications,
      auditLogs
    ] = await Promise.all([
      models.Setting.findOne({ key: 'global' }).lean(),
      models.Property.find().sort({ id: 1 }).lean(),
      models.Flat.find().sort({ id: 1 }).lean(),
      models.Tenant.find().sort({ id: 1 }).lean(),
      models.Lease.find().sort({ id: 1 }).lean(),
      models.Bill.find().sort({ id: 1 }).lean(),
      models.Maintenance.find().sort({ id: 1 }).lean(),
      models.Accounting.find().sort({ id: 1 }).lean(),
      models.Staff.find().sort({ id: 1 }).lean(),
      models.Vendor.find().sort({ id: 1 }).lean(),
      models.Document.find().sort({ id: 1 }).lean(),
      models.Notification.find().sort({ id: 1 }).lean(),
      models.AuditLog.find().sort({ id: -1 }).limit(500).lean()
    ]);

    // If MongoDB has flats or properties, populate targetState from MongoDB
    if (flats && flats.length > 0) {
      targetState.flats = flats.map(sanitizeDoc);
      targetState.bills = (bills || []).map(sanitizeDoc);
      targetState.properties = (properties || []).map(sanitizeDoc);
      targetState.tenants = (tenants || []).map(sanitizeDoc);
      targetState.leases = (leases || []).map(sanitizeDoc);
      targetState.maintenance = (maintenance || []).map(sanitizeDoc);
      targetState.accounting = (accounting || []).map(sanitizeDoc);
      targetState.staff = (staff || []).map(sanitizeDoc);
      targetState.vendors = (vendors || []).map(sanitizeDoc);
      targetState.documents = (documents || []).map(sanitizeDoc);
      targetState.notifications = (notifications || []).map(sanitizeDoc);
      targetState.auditLogs = (auditLogs || []).map(sanitizeDoc);

      if (settingDoc) {
        const { key, _id, __v, createdAt, updatedAt, counters, ...settings } = settingDoc;
        targetState.settings = { ...targetState.settings, ...settings };
        if (counters) {
          targetState.nextPropertyId = counters.nextPropertyId || targetState.nextPropertyId;
          targetState.nextFlatId = counters.nextFlatId || targetState.nextFlatId;
          targetState.nextTenantId = counters.nextTenantId || targetState.nextTenantId;
          targetState.nextLeaseId = counters.nextLeaseId || targetState.nextLeaseId;
          targetState.nextBillId = counters.nextBillId || targetState.nextBillId;
          targetState.nextMaintenanceId = counters.nextMaintenanceId || targetState.nextMaintenanceId;
          targetState.nextTransactionId = counters.nextTransactionId || targetState.nextTransactionId;
          targetState.nextStaffId = counters.nextStaffId || targetState.nextStaffId;
          targetState.nextVendorId = counters.nextVendorId || targetState.nextVendorId;
          targetState.nextDocumentId = counters.nextDocumentId || targetState.nextDocumentId;
          targetState.nextNotificationId = counters.nextNotificationId || targetState.nextNotificationId;
          targetState.nextAuditLogId = counters.nextAuditLogId || targetState.nextAuditLogId;
        }
      }
      return true;
    }

    // If MongoDB is connected but completely empty, seed it from targetState
    console.log('[RentPro Database] MongoDB collections are empty. Auto-seeding MongoDB from current state...');
    await syncToMongo(targetState);
    return true;
  } catch (error) {
    console.error('[RentPro Database] Error loading state from MongoDB:', error.message);
    return false;
  }
}

function sanitizeDoc(doc) {
  if (!doc) return doc;
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return rest;
}

async function closeDB() {
  if (isConnected()) {
    await mongoose.connection.close();
    isMongoActive = false;
  }
}

module.exports = {
  models,
  connectDB,
  closeDB,
  isConnected,
  getConnectionInfo,
  syncToMongo,
  loadFromMongo
};
