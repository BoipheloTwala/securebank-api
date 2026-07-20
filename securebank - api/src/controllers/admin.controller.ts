import { Request, Response, NextFunction } from 'express';
import {
  getAllUsers,
  getUserById,
  deactivateUser,
  unlockUser,
  getAuditLogs,
} from '../services/admin.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, buildPaginationMeta } from '../utils/response.utils';

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: User list
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = await getAllUsers(page, limit);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.users, 'Users retrieved', 200, meta);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a specific user with accounts (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.params.id);
    sendSuccess(res, user, 'User retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /admin/users/{id}/deactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Deactivate a user account (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deactivated
 */
export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = (req as AuthenticatedRequest).user.id;
    const result = await deactivateUser(req.params.id, adminId);
    sendSuccess(res, result, 'User deactivated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /admin/users/{id}/unlock:
 *   patch:
 *     tags: [Admin]
 *     summary: Unlock a locked user account (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Account unlocked
 */
export async function unlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await unlockUser(req.params.id);
    sendSuccess(res, result, 'Account unlocked successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Retrieve audit logs (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Audit logs
 */
export async function auditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, userId } = req.query;
    const result = await getAuditLogs(page, limit, userId as string | undefined);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.logs, 'Audit logs retrieved', 200, meta);
  } catch (err) {
    next(err);
  }
}
