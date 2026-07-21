import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { Prisma } from '@prisma/client';

const BASE = '/api/v1';

const testUser = {
  email: 'txn_test@securebank.com',
  password: 'Test@Password1!',
  firstName: 'Txn',
  lastName: 'Test',
};

let accessToken: string;
let checkingAccountId: string;
let savingsAccountId: string;

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

  const user = await prisma.user.findUnique({ where: { email: testUser.email } });

  const checking = await prisma.account.create({
    data: {
      userId: user!.id,
      accountNumber: `SB-TEST-CHK-${Date.now()}`,
      type: 'CHECKING',
      balance: new Prisma.Decimal(1000),
      currency: 'USD',
    },
  });
  checkingAccountId = checking.id;

  const savings = await prisma.account.create({
    data: {
      userId: user!.id,
      accountNumber: `SB-TEST-SAV-${Date.now()}`,
      type: 'SAVINGS',
      balance: new Prisma.Decimal(0),
      currency: 'USD',
    },
  });
  savingsAccountId = savings.id;
});

describe('POST /transactions/deposit', () => {
  it('deposits funds into an account', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toAccountId: savingsAccountId, amount: 500, currency: 'USD', description: 'Initial deposit' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('DEPOSIT');
    expect(res.body.data.status).toBe('COMPLETED');
    expect(Number(res.body.data.amount)).toBe(500);
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toAccountId: savingsAccountId, amount: -100 });
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/deposit`)
      .send({ toAccountId: savingsAccountId, amount: 100 });
    expect(res.status).toBe(401);
  });
});

describe('POST /transactions/withdraw', () => {
  it('withdraws funds from an account', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fromAccountId: checkingAccountId, amount: 200, currency: 'USD', description: 'ATM withdrawal' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('WITHDRAWAL');
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('returns 422 for insufficient funds', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fromAccountId: checkingAccountId, amount: 999999 });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/insufficient/i);
  });
});

describe('POST /transactions/transfer', () => {
  it('transfers funds between accounts', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/transfer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fromAccountId: checkingAccountId,
        toAccountId: savingsAccountId,
        amount: 100,
        currency: 'USD',
        description: 'Monthly savings',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('TRANSFER');
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('returns 400 when source and destination are the same', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/transfer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fromAccountId: checkingAccountId,
        toAccountId: checkingAccountId,
        amount: 50,
      });
    expect(res.status).toBe(400);
  });

  it('returns 422 for insufficient funds on transfer', async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/transfer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fromAccountId: checkingAccountId,
        toAccountId: savingsAccountId,
        amount: 999999,
      });
    expect(res.status).toBe(422);
  });
});

describe('GET /transactions', () => {
  it('lists transactions for the user', async () => {
    const res = await request(app)
      .get(`${BASE}/transactions`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it('filters transactions by type', async () => {
    const res = await request(app)
      .get(`${BASE}/transactions?type=DEPOSIT`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { type: string }) => t.type === 'DEPOSIT')).toBe(true);
  });
});

describe('GET /transactions/:id', () => {
  let transactionId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(`${BASE}/transactions/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toAccountId: savingsAccountId, amount: 50 });
    transactionId = res.body.data.id;
  });

  it('retrieves a transaction by ID', async () => {
    const res = await request(app)
      .get(`${BASE}/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(transactionId);
  });

  it('returns 404 for non-existent transaction', async () => {
    const res = await request(app)
      .get(`${BASE}/transactions/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});
