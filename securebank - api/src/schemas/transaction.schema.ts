import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const depositSchema = z.object({
  toAccountId: z.string().uuid('Invalid account ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000, 'Amount exceeds single-transaction limit')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  currency: z.string().length(3).toUpperCase().default('USD'),
  description: z.string().max(255).optional(),
});

export const withdrawalSchema = z.object({
  fromAccountId: z.string().uuid('Invalid account ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000, 'Amount exceeds single-transaction limit')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  currency: z.string().length(3).toUpperCase().default('USD'),
  description: z.string().max(255).optional(),
});

export const transferSchema = z.object({
  fromAccountId: z.string().uuid('Invalid source account ID'),
  toAccountId: z.string().uuid('Invalid destination account ID'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000, 'Amount exceeds single-transaction limit')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  currency: z.string().length(3).toUpperCase().default('USD'),
  description: z.string().max(255).optional(),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(TransactionType).optional(),
  accountId: z.string().uuid().optional(),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('Invalid transaction ID'),
});

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
