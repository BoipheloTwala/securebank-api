import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
} from '../services/auth.service';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
} from '../utils/response.utils';

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:     { type: string, format: email }
 *               password:  { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName:  { type: string }
 *     responses:
 *       201:
 *         description: Registration successful
 *       409:
 *         description: Email already in use
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await registerUser(req.body, req.ip);
    sendCreated(res, user, 'Registration successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT tokens
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns access and refresh tokens
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loginUser(req.body, req.ip, req.headers['user-agent']);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using a valid refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await refreshTokens(
      req.body.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke refresh token and logout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await logoutUser(req.body.refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorised
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = (req as AuthenticatedRequest).user;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendUnauthorized(res, 'User not found');
      return;
    }

    sendSuccess(res, user, 'Profile retrieved');
  } catch (err) {
    next(err);
  }
}
