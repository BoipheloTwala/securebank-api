import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';

const BASE = '/api/v1';

const testUser = {
  email: 'account_test@securebank.com',
  password: 'Test@Password1!',
  firstName: 'Account',
  lastName: 'Test',
};

let accessToken: string;

beforeAll(async () => {
  await prisma.auditLog.deleteMany({ where: { user: { email: testUser.email } } });
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany({ where: { user: { email: testUser.email } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: testUser.email } } });
  await prisma.user.deleteMany({ where: { email: testUser.email } });

  await request(app).post(`${BASE}/auth/register`).send(testUser);
  const loginRes = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email: testUser.email, password: testUser.password });
  accessToken = loginRes.body.data.tokens.accessToken;
});

describe('POST /accounts', () => {
  it('creates a CHECKING account', async () => {
    const res = await request(app)
      .post(`${BASE}/accounts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'CHECKING', currency: 'USD' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('CHECKING');
    expect(res.body.data.balance).toBe('0');
    expect(res.body.data.accountNumber).toMatch(/^SB-/);
  });

  it('creates a SAVINGS account', async () => {
    const res = await request(app)
      .post(`${BASE}/accounts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'SAVINGS', currency: 'USD' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('SAVINGS');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post(`${BASE}/accounts`).send({ type: 'CHECKING' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid account type', async () => {
    const res = await request(app)
      .post(`${BASE}/accounts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'INVALID_TYPE' });
    expect(res.status).toBe(400);
  });
});

describe('GET /accounts', () => {
  it('lists accounts for authenticated user', async () => {
    const res = await request(app)
      .get(`${BASE}/accounts`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/accounts`);
    expect(res.status).toBe(401);
  });
});

describe('GET /accounts/:id', () => {
  let accountId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(`${BASE}/accounts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'CHECKING', currency: 'USD' });
    accountId = res.body.data.id;
  });

  it('retrieves account by ID', async () => {
    const res = await request(app)
      .get(`${BASE}/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(accountId);
  });

  it('returns 404 for non-existent account', async () => {
    const res = await request(app)
      .get(`${BASE}/accounts/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app)
      .get(`${BASE}/accounts/not-a-uuid`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /accounts/:id/balance', () => {
  let accountId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(`${BASE}/accounts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'CHECKING', currency: 'USD' });
    accountId = res.body.data.id;
  });

  it('returns account balance', async () => {
    const res = await request(app)
      .get(`${BASE}/accounts/${accountId}/balance`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('balance');
    expect(res.body.data).toHaveProperty('currency');
  });
});
