import { Request, Response, NextFunction } from 'express';
import {
  depositFunds,
  withdrawFunds,
  transferFunds,
  getTransactions,
  getTransactionById,
} from '../services/transaction.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response.utils';

/**
 * @openapi
 * /transactions/deposit:
 *   post:
 *     tags: [Transactions]
 *     summary: Deposit funds into an account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toAccountId, amount]
 *             properties:
 *               toAccountId: { type: string, format: uuid }
 *               amount:      { type: number, example: 500.00 }
 *               currency:    { type: string, example: USD }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Deposit successful
 */
export async function deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const transaction = await depositFunds(userId, req.body);
    sendCreated(res, transaction, 'Deposit successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /transactions/withdraw:
 *   post:
 *     tags: [Transactions]
 *     summary: Withdraw funds from an account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAccountId, amount]
 *             properties:
 *               fromAccountId: { type: string, format: uuid }
 *               amount:        { type: number, example: 200.00 }
 *               currency:      { type: string, example: USD }
 *               description:   { type: string }
 *     responses:
 *       201:
 *         description: Withdrawal successful
 *       422:
 *         description: Insufficient funds
 */
export async function withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const transaction = await withdrawFunds(userId, req.body);
    sendCreated(res, transaction, 'Withdrawal successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /transactions/transfer:
 *   post:
 *     tags: [Transactions]
 *     summary: Transfer funds between accounts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAccountId, toAccountId, amount]
 *             properties:
 *               fromAccountId: { type: string, format: uuid }
 *               toAccountId:   { type: string, format: uuid }
 *               amount:        { type: number, example: 100.00 }
 *               currency:      { type: string, example: USD }
 *               description:   { type: string }
 *     responses:
 *       201:
 *         description: Transfer successful
 *       422:
 *         description: Insufficient funds or cross-currency not supported
 */
export async function transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const transaction = await transferFunds(userId, req.body);
    sendCreated(res, transaction, 'Transfer successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: List transactions for the authenticated user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [DEPOSIT, WITHDRAWAL, TRANSFER, FEE, REVERSAL] }
 *       - in: query
 *         name: accountId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction list
 */
export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const result = await getTransactions(userId, req.query as never);
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    sendSuccess(res, result.transactions, 'Transactions retrieved', 200, meta);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /transactions/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a specific transaction by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Transaction not found
 */
export async function getTransaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const transaction = await getTransactionById(req.params.id, userId);
    sendSuccess(res, transaction, 'Transaction retrieved');
  } catch (err) {
    next(err);
  }
}
