import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';

const BASE = '/api/v1/auth';

const validUser = {
  email: 'auth_test@securebank.com',
  password: 'Test@Password1!',
  firstName: 'Auth',
  lastName: 'Test',
};

beforeEach(async () => {
  await prisma.auditLog.deleteMany({ where: { user: { email: validUser.email } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: validUser.email } } });
  await prisma.user.deleteMany({ where: { email: validUser.email } });
});

describe('POST /auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(validUser.email);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app).post(`${BASE}/register`).send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for weak password', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post(`${BASE}/register`).send({ email: validUser.email });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'nobody@securebank.com', password: validUser.password });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  let accessToken: string;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    accessToken = loginRes.body.data.tokens.accessToken;
  });

  it('returns the authenticated user profile', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(validUser.email);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', 'Bearer totally.invalid.token');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    refreshToken = loginRes.body.data.tokens.refreshToken;
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: 'invalidtoken' });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    accessToken = loginRes.body.data.tokens.accessToken;
    refreshToken = loginRes.body.data.tokens.refreshToken;
  });

  it('logs out successfully', async () => {
    const res = await request(app)
      .post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
