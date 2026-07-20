import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateAccountNumber } from '../utils/hash.utils';
import { CreateAccountInput } from '../schemas/account.schema';
import { parsePagination } from '../utils/sanitise.utils';

export async function createAccount(userId: string, input: CreateAccountInput) {
  const accountNumber = generateAccountNumber();

  const account = await prisma.account.create({
    data: {
      userId,
      accountNumber,
      type: input.type,
      currency: input.currency,
    },
    select: {
      id: true,
      accountNumber: true,
      type: true,
      balance: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  });

  return account;
}

export async function getUserAccounts(userId: string, page?: unknown, limit?: unknown) {
  const { page: pg, limit: lmt, skip } = parsePagination(page, limit);

  const [accounts, total] = await prisma.$transaction([
    prisma.account.findMany({
      where: { userId },
      skip,
      take: lmt,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        accountNumber: true,
        type: true,
        balance: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.account.count({ where: { userId } }),
  ]);

  return { accounts, total, page: pg, limit: lmt };
}

export async function getAccountById(accountId: string, userId: string, isAdmin = false) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });

  if (!account) {
    throw new AppError('Account not found', 404);
  }

  if (!isAdmin && account.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  return account;
}

export async function getAccountBalance(accountId: string, userId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, accountNumber: true, balance: true, currency: true, userId: true, status: true },
  });

  if (!account) {
    throw new AppError('Account not found', 404);
  }

  if (account.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  return { balance: account.balance, currency: account.currency, accountNumber: account.accountNumber };
}

export async function verifyAccountOwnership(
  accountId: string,
  userId: string
): Promise<{ id: string; balance: Decimal; currency: string; status: string }> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true, balance: true, currency: true, status: true },
  });

  if (!account) throw new AppError('Account not found', 404);
  if (account.userId !== userId) throw new AppError('Access denied to this account', 403);
  if (account.status !== 'ACTIVE') throw new AppError('Account is not active', 422);

  return account;
}
