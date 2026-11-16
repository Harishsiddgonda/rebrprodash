'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const temp = path.join(os.tmpdir(), `rentpro-test-${process.pid}.json`);
process.env.RENTPRO_DATA_FILE = temp;
const { resetForTests } = require('../src/store');
const app = require('../src/app');

test('RentPro API test suite', async (t) => {
  await t.test('API flow: create flat, bill, CSV export, partial payment, dashboard and duplicate month validation', async () => {
    resetForTests();
    const created = await request(app).post('/api/flats').send({ flatNumber: '101', tenantName: 'Demo Tenant', phone: '9999999999', monthlyRent: 10000, electricityReading: 1250, waterReading: 100 });
    assert.equal(created.status, 201);
    const id = created.body.id;
    const bills = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [{ flatId: id, electricityPrevious: 1250, electricityCurrent: 1400, waterPrevious: 100, waterCurrent: 115 }] });
    assert.equal(bills.status, 201);
    assert.equal(bills.body[0].total, 11775);
    const csv = await request(app).get('/api/export/2026-11.csv');
    assert.equal(csv.status, 200);
    assert.match(csv.text, /flatNumber,tenantName/);
    assert.match(csv.text, /101,Demo Tenant/);
    const duplicate = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [] });
    assert.equal(duplicate.status, 409);
    const paid = await request(app).post(`/api/bills/${bills.body[0].id}/payment`).send({ amount: 5000, paymentMethod: 'UPI' });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.status, 'PARTIAL');
    assert.equal(paid.body.balance, 6775);
    assert.equal(paid.body.payments.length, 1);
    assert.deepEqual(paid.body.payments[0], { id: '1-1', amount: 5000, paymentMethod: 'UPI', paymentDate: new Date().toISOString().slice(0, 10) });
    const dash = await request(app).get('/api/dashboard?month=2026-11');
    assert.equal(dash.body.totalFlats, 1);
    assert.equal(dash.body.collected, 5000);
    assert.equal(dash.body.pending, 6775);
    assert.equal(dash.body.recentPayments.length, 1);
    assert.equal(dash.body.recentPayments[0].paymentMethod, 'UPI');
    const pdf = await request(app).get(`/api/bills/${bills.body[0].id}/pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers['content-type'], /application\/pdf/);
  });

  await t.test('rejects incorrect carried-forward meter readings', async () => {
    resetForTests();
    const f = await request(app).post('/api/flats').send({ flatNumber: '202', monthlyRent: 6000, electricityReading: 22, waterReading: 4 });
    const r = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [{ flatId: f.body.id, electricityPrevious: 0, electricityCurrent: 30, waterPrevious: 4, waterCurrent: 5 }] });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Previous readings must carry forward/);
  });

  await t.test('rejects invalid month format', async () => {
    const r = await request(app).post('/api/bills/generate').send({ month: 'Nov-26', readings: [] });
    assert.equal(r.status, 400);
  });

  await t.test('rejects payment greater than balance', async () => {
    resetForTests();
    const f = await request(app).post('/api/flats').send({ flatNumber: '303', monthlyRent: 1000, electricityReading: 0, waterReading: 0 });
    const b = await request(app).post('/api/bills/generate').send({ month: '2026-11', readings: [{ flatId: f.body.id, electricityPrevious: 0, electricityCurrent: 0, waterPrevious: 0, waterCurrent: 0 }] });
    assert.equal(b.status, 201);
    const r = await request(app).post(`/api/bills/${b.body[0].id}/payment`).send({ amount: 5000 });
    assert.equal(r.status, 400);
  });

  await t.test('owner authentication protects APIs when enabled and allows login', async () => {
    const previous = {
      enabled: process.env.AUTH_ENABLED,
      email: process.env.OWNER_EMAIL,
      passwordHash: process.env.OWNER_PASSWORD_HASH,
      jwtSecret: process.env.JWT_SECRET
    };
    process.env.AUTH_ENABLED = 'true';
    process.env.OWNER_EMAIL = 'owner@example.com';
    process.env.OWNER_PASSWORD_HASH = await bcrypt.hash('correct horse battery staple', 4);
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
    try {
      assert.equal((await request(app).get('/api/auth/config')).body.enabled, true);
      assert.equal((await request(app).get('/api/flats')).status, 401);
      const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'owner@example.com', password: 'wrong' });
      assert.equal(wrongPassword.status, 401);
      const login = await request(app).post('/api/auth/login').send({ email: 'OWNER@example.com', password: 'correct horse battery staple' });
      assert.equal(login.status, 200);
      assert.ok(login.body.token);
      assert.equal((await request(app).get('/api/flats').set('Authorization', `Bearer ${login.body.token}`)).status, 200);
      assert.equal((await request(app).get('/api/flats').set('Authorization', 'Bearer invalid')).status, 401);
      assert.equal((await request(app).get('/api/health')).status, 200);
    } finally {
      for (const [key,value] of [['AUTH_ENABLED',previous.enabled],['OWNER_EMAIL',previous.email],['OWNER_PASSWORD_HASH',previous.passwordHash],['JWT_SECRET',previous.jwtSecret]]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  await t.test('rejects an invalid payment date', async () => {
    resetForTests();
    const flat = await request(app).post('/api/flats').send({ flatNumber:'404', monthlyRent:100 });
    const generated = await request(app).post('/api/bills/generate').send({
      month:'2026-11',
      readings:[{flatId:flat.body.id,electricityPrevious:0,electricityCurrent:0,waterPrevious:0,waterCurrent:0}]
    });
    const payment = await request(app).post(`/api/bills/${generated.body[0].id}/payment`).send({amount:10,paymentDate:'2026-02-31'});
    assert.equal(payment.status,400);
    assert.match(payment.body.error,/valid YYYY-MM-DD/);
  });

  await t.test('flat updates reject duplicates and invalid values without changing saved data', async () => {
    resetForTests();
    const first = await request(app).post('/api/flats').send({ flatNumber:'501', monthlyRent:1000 });
    const second = await request(app).post('/api/flats').send({ flatNumber:'502', monthlyRent:2000 });
    assert.equal((await request(app).put(`/api/flats/${second.body.id}`).send({flatNumber:'501'})).status,409);
    const invalid = await request(app).put(`/api/flats/${second.body.id}`).send({monthlyRent:-10});
    assert.equal(invalid.status,400);
    const flats = await request(app).get('/api/flats');
    assert.equal(flats.body[1].flatNumber,'502');
    assert.equal(flats.body[1].monthlyRent,2000);
    assert.equal(first.status,201);
  });
});

test.after(() => {
  try { fs.unlinkSync(temp); } catch {}
});
