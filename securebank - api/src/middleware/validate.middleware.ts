import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendBadRequest } from '../utils/response.utils';
import { ValidationError } from '../types';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const errors: ValidationError[] = mapZodErrors(result.error);
      sendBadRequest(res, 'Validation failed', errors);
      return;
    }

    req[part] = result.data;
    next();
  };
}

function mapZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map((e) => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));
}
