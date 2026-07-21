import { Router } from 'express';
import { authenticate, authorise } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { Role } from '@prisma/client';
import * as report from '../controllers/report.controller';

const router = Router();

router.use(authenticate);

router.get('/',                report.list);
router.get('/:id',            report.getOne);
router.get('/:id/download',   report.download);

router.post('/generate',
  authorise(Role.GRC_ANALYST, Role.AUDITOR, Role.ADMIN),
  auditLog('GENERATE_REPORT', 'reports'),
  report.generate,
);

router.delete('/:id',
  authorise(Role.ADMIN),
  auditLog('DELETE_REPORT', 'reports'),
  report.remove,
);

export default router;
