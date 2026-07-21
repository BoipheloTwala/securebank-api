import { Request, Response, NextFunction } from 'express';
import {
  createAccount,
  getUserAccounts,
  getAccountById,
  getAccountBalance,
} from '../services/account.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response.utils';

/**
 * @openapi
 * /accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Open a new bank account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:     { type: string, enum: [CHECKING, SAVINGS, FIXED_DEPOSIT] }
 *               currency: { type: string, example: USD }
 *     responses:
 *       201:
 *         description: Account created
 */
export async function openAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const account = await createAccount(userId, req.body);
    sendCreated(res, account, 'Account opened successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: List all accounts for the authenticated user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of accounts
 */
export async function listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { page, limit } = req.query;
    const result = await getUserAccounts(userId, page, limit);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.accounts, 'Accounts retrieved', 200, meta);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /accounts/{id}:
 *   get:
 *     tags: [Accounts]
 *     summary: Get details of a specific account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Account details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 */
export async function getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId, role } = (req as AuthenticatedRequest).user;
    const account = await getAccountById(req.params.id as string, userId, role === 'ADMIN');
    sendSuccess(res, account, 'Account retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /accounts/{id}/balance:
 *   get:
 *     tags: [Accounts]
 *     summary: Get the balance of a specific account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Account balance
 */
export async function getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const balance = await getAccountBalance(req.params.id as string, userId);
    sendSuccess(res, balance, 'Balance retrieved');
  } catch (err) {
    next(err);
  }
}
