import { prisma } from '../src/config/database';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://securebank:securebank_pass@localhost:5432/securebank_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars_long_ok';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '4';
process.env.PORT = '3001';
process.env.API_PREFIX = '/api/v1';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '100';
process.env.MAX_FAILED_LOGIN_ATTEMPTS = '5';
process.env.ACCOUNT_LOCK_DURATION_MINUTES = '30';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});
