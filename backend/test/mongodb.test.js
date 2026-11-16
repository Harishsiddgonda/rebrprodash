'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { models, isConnected, getConnectionInfo } = require('../src/db');
const app = require('../src/app');

test('MongoDB integration test suite', async (t) => {
  await t.test('all Mongoose models are loaded and defined', () => {
    const expectedModels = [
      'Property',
      'Flat',
      'Tenant',
      'Lease',
      'Bill',
      'Maintenance',
      'Accounting',
      'Staff',
      'Vendor',
      'Document',
      'Notification',
      'AuditLog',
      'Setting'
    ];

    for (const modelName of expectedModels) {
      assert.ok(models[modelName], `Model ${modelName} should be defined`);
      assert.equal(models[modelName].modelName, modelName);
    }
  });

  await t.test('Flat model schema validation accepts valid flat data', async () => {
    const flat = new models.Flat({
      id: 999,
      flatNumber: '999',
      tenantName: 'Test Tenant',
      monthlyRent: 20000,
      electricityReading: 100,
      waterReading: 20
    });
    let error = null;
    try {
      await flat.validate();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null, 'Valid flat should not produce validation errors');
  });

  await t.test('Flat model schema validation rejects negative rent', async () => {
    const flat = new models.Flat({
      id: 998,
      flatNumber: '998',
      monthlyRent: -500
    });
    let error = null;
    try {
      await flat.validate();
    } catch (e) {
      error = e;
    }
    assert.ok(error, 'Negative rent should fail validation');
    assert.ok(error.errors.monthlyRent);
  });

  await t.test('Bill model schema validates complete invoice structure', async () => {
    const bill = new models.Bill({
      id: 999,
      flatId: 1,
      flatNumber: '101',
      month: '2026-11',
      rent: 15000,
      electricityPrevious: 100,
      electricityCurrent: 150,
      electricityUnits: 50,
      electricityRate: 8,
      electricityAmount: 400,
      waterPrevious: 20,
      waterCurrent: 25,
      waterUnits: 5,
      waterRate: 30,
      waterAmount: 150,
      garbageAmount: 125,
      total: 15675,
      balance: 15675
    });
    let error = null;
    try {
      await bill.validate();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null, 'Valid bill should not produce validation errors');
  });

  await t.test('getConnectionInfo returns database configuration details', () => {
    const info = getConnectionInfo();
    assert.ok(typeof info.configured === 'boolean');
    assert.ok(typeof info.connected === 'boolean');
    assert.ok(Array.isArray(info.models));
    assert.ok(info.models.length >= 13);
  });

  await t.test('GET /api/database/status returns accurate database metadata', async () => {
    const res = await request(app).get('/api/database/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(['mongodb', 'json'].includes(res.body.activeDatabase));
    assert.ok(res.body.mongodb);
    assert.ok(typeof res.body.counts.flats === 'number');
    assert.ok(typeof res.body.counts.bills === 'number');
  });

  await t.test('GET /api/health includes database status details', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.body.database);
    assert.ok(['mongodb', 'json'].includes(res.body.database.type));
    assert.ok(res.body.database.mongodb);
  });
});
