import { Router } from 'express';
import {
  listUsers,
  getUser,
  deactivate,
  unlock,
  auditLogs,
} from '../controllers/admin.controller';
import { authenticate, authorise } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate, authorise(Role.ADMIN));

router.get('/users', auditLog('LIST_USERS', 'admin'), listUsers);
router.get('/users/:id', auditLog('VIEW_USER', 'admin'), getUser);
router.patch('/users/:id/deactivate', auditLog('DEACTIVATE_USER', 'admin'), deactivate);
router.patch('/users/:id/unlock', auditLog('UNLOCK_USER', 'admin'), unlock);
router.get('/audit-logs', auditLog('VIEW_AUDIT_LOGS', 'admin'), auditLogs);

export default router;
