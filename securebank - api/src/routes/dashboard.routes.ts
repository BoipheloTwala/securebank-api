import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as dashboard from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/kpis',             dashboard.kpis);
router.get('/activity',         dashboard.activity);
router.get('/compliance-score', dashboard.complianceScore);

export default router;
