import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateTransactionReference } from '../utils/hash.utils';
import { parsePagination } from '../utils/sanitise.utils';
import { DepositInput, WithdrawalInput, TransferInput, TransactionQueryInput } from '../schemas/transaction.schema';
import { verifyAccountOwnership } from './account.service';

export async function depositFunds(userId: string, input: DepositInput) {
  const account = await verifyAccountOwnership(input.toAccountId, userId);

  const amount = new Prisma.Decimal(input.amount);
  const balanceBefore = account.balance;
  const balanceAfter = balanceBefore.add(amount);

  const transaction = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.account.update({
      where: { id: account.id },
      data: { balance: balanceAfter },
    });

    return tx.transaction.create({
      data: {
        reference: generateTransactionReference(),
        toAccountId: account.id,
        amount,
        currency: input.currency,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: input.description ?? 'Deposit',
        balanceBefore,
        balanceAfter: updatedAccount.balance,
      },
    });
  });

  return transaction;
}

export async function withdrawFunds(userId: string, input: WithdrawalInput) {
  const account = await verifyAccountOwnership(input.fromAccountId, userId);

  const amount = new Prisma.Decimal(input.amount);

  if (account.balance.lessThan(amount)) {
    throw new AppError('Insufficient funds', 422);
  }

  const balanceBefore = account.balance;
  const balanceAfter = balanceBefore.sub(amount);

  const transaction = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.account.update({
      where: { id: account.id },
      data: { balance: balanceAfter },
    });

    return tx.transaction.create({
      data: {
        reference: generateTransactionReference(),
        fromAccountId: account.id,
        amount,
        currency: input.currency,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
        description: input.description ?? 'Withdrawal',
        balanceBefore,
        balanceAfter: updatedAccount.balance,
      },
    });
  });

  return transaction;
}

export async function transferFunds(userId: string, input: TransferInput) {
  if (input.fromAccountId === input.toAccountId) {
    throw new AppError('Cannot transfer to the same account', 400);
  }

  const fromAccount = await verifyAccountOwnership(input.fromAccountId, userId);

  const toAccount = await prisma.account.findUnique({
    where: { id: input.toAccountId },
    select: { id: true, balance: true, currency: true, status: true },
  });

  if (!toAccount) throw new AppError('Destination account not found', 404);
  if (toAccount.status !== 'ACTIVE') throw new AppError('Destination account is not active', 422);

  if (fromAccount.currency !== toAccount.currency) {
    throw new AppError('Cross-currency transfers are not supported', 422);
  }

  const amount = new Prisma.Decimal(input.amount);

  if (fromAccount.balance.lessThan(amount)) {
    throw new AppError('Insufficient funds', 422);
  }

  const fromBalanceBefore = fromAccount.balance;
  const toBalanceBefore = toAccount.balance;

  const transaction = await prisma.$transaction(async (tx) => {
    const updatedFrom = await tx.account.update({
      where: { id: fromAccount.id },
      data: { balance: fromBalanceBefore.sub(amount) },
    });

    await tx.account.update({
      where: { id: toAccount.id },
      data: { balance: toBalanceBefore.add(amount) },
    });

    return tx.transaction.create({
      data: {
        reference: generateTransactionReference(),
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount,
        currency: input.currency,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.COMPLETED,
        description: input.description ?? 'Transfer',
        balanceBefore: fromBalanceBefore,
        balanceAfter: updatedFrom.balance,
      },
    });
  });

  return transaction;
}

export async function getTransactions(userId: string, query: TransactionQueryInput) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const userAccountIds = await prisma.account
    .findMany({ where: { userId }, select: { id: true } })
    .then((accounts) => accounts.map((a) => a.id));

  const where: Prisma.TransactionWhereInput = {
    OR: [
      { fromAccountId: { in: userAccountIds } },
      { toAccountId: { in: userAccountIds } },
    ],
    ...(query.type && { type: query.type }),
    ...(query.accountId && {
      OR: [{ fromAccountId: query.accountId }, { toAccountId: query.accountId }],
    }),
  };

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, page, limit };
}

export async function getTransactionById(transactionId: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      fromAccount: { select: { id: true, accountNumber: true, userId: true } },
      toAccount: { select: { id: true, accountNumber: true, userId: true } },
    },
  });

  if (!transaction) throw new AppError('Transaction not found', 404);

  const isOwner =
    transaction.fromAccount?.userId === userId || transaction.toAccount?.userId === userId;

  if (!isOwner) throw new AppError('Access denied', 403);

  return transaction;
}
