import { Router } from 'express';
import {
  deposit,
  withdraw,
  transfer,
  listTransactions,
  getTransaction,
} from '../controllers/transaction.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { transactionRateLimiter } from '../middleware/rateLimiter.middleware';
import { auditLog } from '../middleware/audit.middleware';
import {
  depositSchema,
  withdrawalSchema,
  transferSchema,
  transactionQuerySchema,
  transactionIdParamSchema,
} from '../schemas/transaction.schema';

const router = Router();

router.use(authenticate);
router.use(transactionRateLimiter);

router.post(
  '/deposit',
  validate(depositSchema),
  auditLog('DEPOSIT', 'transactions'),
  deposit
);

router.post(
  '/withdraw',
  validate(withdrawalSchema),
  auditLog('WITHDRAWAL', 'transactions'),
  withdraw
);

router.post(
  '/transfer',
  validate(transferSchema),
  auditLog('TRANSFER', 'transactions'),
  transfer
);

router.get('/', validate(transactionQuerySchema, 'query'), listTransactions);

router.get('/:id', validate(transactionIdParamSchema, 'params'), getTransaction);

export default router;
