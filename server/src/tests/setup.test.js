'use strict';
const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');

beforeAll(async () => { await setup(); });
afterAll(async () => { await teardown(); });
afterEach(async () => { await clearDB(); });

const validSetup = {
  companyName: 'Test Corp',
  adminName: 'Admin User',
  adminEmail: 'admin@test.com',
  adminPassword: 'password123',
};

describe('GET /api/setup/status', () => {
  it('returns initialized=false on empty DB', async () => {
    const res = await request(app).get('/api/setup/status');
    expect(res.status).toBe(200);
    expect(res.body.initialized).toBe(false);
  });

  it('returns initialized=true after setup', async () => {
    await request(app).post('/api/setup').send(validSetup);
    const res = await request(app).get('/api/setup/status');
    expect(res.body.initialized).toBe(true);
  });
});

describe('POST /api/setup', () => {
  it('creates admin on first call -> 201', async () => {
    const res = await request(app).post('/api/setup').send(validSetup);
    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
  });

  it('returns 409 on second call', async () => {
    await request(app).post('/api/setup').send(validSetup);
    const res = await request(app).post('/api/setup').send(validSetup);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 422 for missing fields', async () => {
    const res = await request(app).post('/api/setup').send({ companyName: 'X' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for short password', async () => {
    const res = await request(app).post('/api/setup').send({ ...validSetup, adminPassword: 'short' });
    expect(res.status).toBe(422);
  });
});
