import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateAccountNumber(): string {
  const timestamp = Date.now().toString().slice(-7);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `SB-${timestamp}${random}`;
}

export function generateTransactionReference(): string {
  const prefix = 'TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
