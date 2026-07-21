import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateSecureToken,
} from '../utils/hash.utils';
import {
  signAccessToken,
  getAccessTokenExpirySeconds,
} from '../utils/jwt.utils';
import { sanitiseEmail } from '../utils/sanitise.utils';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { TokenPair } from '../types';
import { logger } from '../config/logger';

export async function registerUser(input: RegisterInput, ipAddress?: string) {
  const email = sanitiseEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  logger.info('User registered', { userId: user.id, ip: ipAddress });
  return user;
}

export async function loginUser(
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: object; tokens: TokenPair }> {
  const email = sanitiseEmail(input.email);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(
      `Account is locked. Try again in ${minutesLeft} minute(s)`,
      423
    );
  }

  const passwordValid = await comparePassword(input.password, user.passwordHash);

  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= env.MAX_FAILED_LOGIN_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + env.ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000)
          : null,
      },
    });

    if (shouldLock) {
      logger.warn('Account locked after failed attempts', { userId: user.id, ip: ipAddress });
      throw new AppError(
        `Account locked after ${env.MAX_FAILED_LOGIN_ATTEMPTS} failed attempts`,
        423
      );
    }

    throw new AppError('Invalid credentials', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress ?? null,
    },
  });

  const tokens = await issueTokenPair(
    { id: user.id, email: user.email, role: user.role },
    ipAddress,
    userAgent
  );

  logger.info('User logged in', { userId: user.id, ip: ipAddress });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    tokens,
  };
}

export async function refreshTokens(
  rawRefreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> {
  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token is invalid or has been revoked', 401);
  }

  await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { isRevoked: true } });

  const user = await prisma.user.findUnique({ where: { id: storedToken.userId } });
  if (!user || !user.isActive) {
    throw new AppError('User account is inactive', 401);
  }

  return issueTokenPair({ id: user.id, email: user.email, role: user.role }, ipAddress, userAgent);
}

export async function logoutUser(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { isRevoked: true },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

async function issueTokenPair(
  user: { id: string; email: string; role: import('@prisma/client').Role },
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> {
  const accessToken = signAccessToken(user);
  const refreshToken = generateSecureToken(48);

  const tokenHash = hashToken(refreshToken);

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: refreshExpiresAt,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
  };
}
