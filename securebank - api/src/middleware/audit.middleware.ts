import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { logger } from '../config/logger';

export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    let statusCode = 200;

    res.json = function (body) {
      statusCode = res.statusCode;
      return originalJson(body);
    };

    res.on('finish', () => {
      const user = (req as AuthenticatedRequest).user;
      const resourceId =
        (req.params.id as string | undefined) ?? (req.params.accountId as string | undefined);

      prisma.auditLog
        .create({
          data: {
            userId: user?.id ?? null,
            action,
            resource,
            resourceId: resourceId ?? null,
            ipAddress: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
            statusCode,
            metadata: { method: req.method, path: req.path } as Record<string, unknown>,
          },
        })
        .catch((err: unknown) => {
          logger.error('Failed to write audit log', { err });
        });
    });

    next();
  };
}
