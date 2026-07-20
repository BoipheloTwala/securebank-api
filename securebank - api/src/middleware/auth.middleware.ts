import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.utils';
import { sendUnauthorized, sendForbidden } from '../utils/response.utils';
import { AuthenticatedRequest } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Missing or malformed authorisation token');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      sendUnauthorized(res, 'Invalid token type');
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired token');
  }
}

export function authorise(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(user.role)) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
}
