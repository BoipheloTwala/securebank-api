import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { sendTooManyRequests } from '../utils/response.utils';
import { Request, Response } from 'express';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Too many requests, please try again later');
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Too many authentication attempts, please try again in 15 minutes');
  },
});

export const transactionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Transaction rate limit exceeded');
  },
});
