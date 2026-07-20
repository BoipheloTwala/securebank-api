import { prisma } from '../config/database';
import { parsePagination } from '../utils/sanitise.utils';
import { AppError } from '../middleware/error.middleware';
import { revokeAllUserTokens } from './auth.service';

export async function getAllUsers(page?: unknown, limit?: unknown) {
  const { page: pg, limit: lmt, skip } = parsePagination(page, limit);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: lmt,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  return { users, total, page: pg, limit: lmt };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      accounts: {
        select: { id: true, accountNumber: true, type: true, balance: true, status: true },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function deactivateUser(userId: string, adminId: string) {
  if (userId === adminId) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  await revokeAllUserTokens(userId);

  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: { id: true, email: true, isActive: true },
  });
}

export async function unlockUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  return prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, isActive: true },
    select: { id: true, email: true, isActive: true, failedLoginAttempts: true, lockedUntil: true },
  });
}

export async function getAuditLogs(page?: unknown, limit?: unknown, userId?: string) {
  const { page: pg, limit: lmt, skip } = parsePagination(page, limit);

  const where = userId ? { userId } : {};

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: lmt,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page: pg, limit: lmt };
}
