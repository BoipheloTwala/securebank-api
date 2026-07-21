import { Router } from 'express';
import { authenticate, authorise } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { Role } from '@prisma/client';
import * as evidence from '../controllers/evidence.controller';

const router = Router();

router.use(authenticate);

router.get('/',              evidence.list);
router.get('/:id',           evidence.getOne);
router.get('/:id/download',  evidence.download);

router.post('/',
  authorise(Role.ANALYST, Role.GRC_ANALYST, Role.ADMIN),
  auditLog('UPLOAD_EVIDENCE', 'evidence'),
  uploadMiddleware.single('file'),
  evidence.upload,
);

router.patch('/:id',
  authorise(Role.ANALYST, Role.GRC_ANALYST, Role.AUDITOR, Role.ADMIN),
  auditLog('UPDATE_EVIDENCE', 'evidence'),
  evidence.update,
);

router.delete('/:id',
  authorise(Role.ANALYST, Role.ADMIN),
  auditLog('DELETE_EVIDENCE', 'evidence'),
  evidence.remove,
);

export default router;
