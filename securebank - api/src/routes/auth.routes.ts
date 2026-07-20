import { Router } from 'express';
import { register, login, refresh, logout, getProfile } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { auditLog } from '../middleware/audit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../schemas/auth.schema';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  auditLog('REGISTER', 'auth'),
  register
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  auditLog('LOGIN', 'auth'),
  login
);

router.post('/refresh', validate(refreshSchema), refresh);

router.post(
  '/logout',
  authenticate,
  validate(refreshSchema),
  auditLog('LOGOUT', 'auth'),
  logout
);

router.get('/me', authenticate, getProfile);

export default router;
