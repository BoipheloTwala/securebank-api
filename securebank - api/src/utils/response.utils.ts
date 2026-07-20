import { Response } from 'express';
import { ApiResponse, PaginationMeta, ValidationError } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta
): void {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): void {
  sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: ValidationError[]
): void {
  const response: ApiResponse = { success: false, message };
  if (errors) response.errors = errors;
  res.status(statusCode).json(response);
}

export function sendUnauthorized(res: Response, message = 'Unauthorised'): void {
  sendError(res, message, 401);
}

export function sendForbidden(res: Response, message = 'Forbidden'): void {
  sendError(res, message, 403);
}

export function sendNotFound(res: Response, message = 'Resource not found'): void {
  sendError(res, message, 404);
}

export function sendBadRequest(
  res: Response,
  message = 'Bad request',
  errors?: ValidationError[]
): void {
  sendError(res, message, 400, errors);
}

export function sendConflict(res: Response, message = 'Conflict'): void {
  sendError(res, message, 409);
}

export function sendTooManyRequests(res: Response, message = 'Too many requests'): void {
  sendError(res, message, 429);
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
