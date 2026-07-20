import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import accountRoutes from './account.routes';
import transactionRoutes from './transaction.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SecureBank API is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/admin', adminRoutes);

export default router;
