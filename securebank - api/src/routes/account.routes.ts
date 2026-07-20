import { Router } from 'express';
import {
  openAccount,
  listAccounts,
  getAccount,
  getBalance,
} from '../controllers/account.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createAccountSchema, accountIdParamSchema, paginationQuerySchema } from '../schemas/account.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createAccountSchema), auditLog('CREATE_ACCOUNT', 'accounts'), openAccount);

router.get('/', validate(paginationQuerySchema, 'query'), listAccounts);

router.get('/:id', validate(accountIdParamSchema, 'params'), getAccount);

router.get('/:id/balance', validate(accountIdParamSchema, 'params'), getBalance);

export default router;
