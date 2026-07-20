import { z } from 'zod';
import { AccountType } from '@prisma/client';

export const createAccountSchema = z.object({
  type: z.nativeEnum(AccountType).default(AccountType.CHECKING),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .toUpperCase()
    .default('USD'),
});

export const accountIdParamSchema = z.object({
  id: z.string().uuid('Invalid account ID'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type AccountIdParam = z.infer<typeof accountIdParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
