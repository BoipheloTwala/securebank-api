import { Router } from 'express';
import { authenticate, authorise } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { Role } from '@prisma/client';
import * as control from '../controllers/control.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', control.frameworkSummary);
router.get('/',        control.list);
router.get('/:id',     control.getOne);

router.post('/',
  authorise(Role.GRC_ANALYST, Role.ADMIN),
  auditLog('CREATE_CONTROL', 'controls'),
  control.create,
);

router.patch('/:id',
  authorise(Role.GRC_ANALYST, Role.ADMIN),
  auditLog('UPDATE_CONTROL', 'controls'),
  control.update,
);

router.delete('/:id',
  authorise(Role.GRC_ANALYST, Role.ADMIN),
  auditLog('DELETE_CONTROL', 'controls'),
  control.remove,
);

router.post('/:id/risks',
  authorise(Role.GRC_ANALYST, Role.ADMIN),
  auditLog('LINK_RISK_CONTROL', 'controls'),
  control.linkRisk,
);

router.delete('/:id/risks/:riskId',
  authorise(Role.GRC_ANALYST, Role.ADMIN),
  auditLog('UNLINK_RISK_CONTROL', 'controls'),
  control.unlinkRisk,
);

export default router;
