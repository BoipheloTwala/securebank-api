import { Router } from 'express';
import { authenticate, authorise } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { Role } from '@prisma/client';
import * as risk from '../controllers/risk.controller';

const router = Router();

router.use(authenticate);

router.get('/summary',  risk.summary);
router.get('/heatmap',  risk.heatmap);
router.get('/trend',    risk.trend);
router.get('/',         risk.list);
router.get('/:id',      risk.getOne);

router.post('/',
  authorise(Role.ANALYST, Role.GRC_ANALYST, Role.ADMIN),
  auditLog('CREATE_RISK', 'risks'),
  risk.create,
);

router.patch('/:id',
  authorise(Role.ANALYST, Role.GRC_ANALYST, Role.ADMIN),
  auditLog('UPDATE_RISK', 'risks'),
  risk.update,
);

router.delete('/:id',
  authorise(Role.ANALYST, Role.ADMIN),
  auditLog('DELETE_RISK', 'risks'),
  risk.remove,
);

export default router;
