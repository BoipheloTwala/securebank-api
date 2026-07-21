import { Router, Request, Response } from 'express';
import authRoutes        from './auth.routes';
import accountRoutes     from './account.routes';
import transactionRoutes from './transaction.routes';
import adminRoutes       from './admin.routes';
import riskRoutes        from './risk.routes';
import controlRoutes     from './control.routes';
import evidenceRoutes    from './evidence.routes';
import dashboardRoutes   from './dashboard.routes';
import reportRoutes      from './report.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SecureBank API is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.use('/auth',         authRoutes);
router.use('/accounts',     accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/admin',        adminRoutes);
router.use('/risks',        riskRoutes);
router.use('/controls',     controlRoutes);
router.use('/evidence',     evidenceRoutes);
router.use('/dashboard',    dashboardRoutes);
router.use('/reports',      reportRoutes);

export default router;
