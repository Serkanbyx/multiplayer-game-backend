import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../utils/apiResponse.js';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * `postgres-js` and `pg` both surface PostgreSQL errors with a 5-character
 * SQLSTATE code on the `code` field. We only special-case the codes that map
 * to user-facing 4xx responses; everything else stays a generic 500.
 */
interface PostgresError extends AppError {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

const isPostgresError = (err: unknown): err is PostgresError => {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code);
};

const mapPostgresError = (
  err: PostgresError,
): { statusCode: number; message: string } | null => {
  switch (err.code) {
    case '23505': // unique_violation
      return { statusCode: 409, message: 'A record with that value already exists' };
    case '23503': // foreign_key_violation
      return { statusCode: 409, message: 'Referenced resource not found' };
    case '23502': // not_null_violation
      return { statusCode: 400, message: 'Missing required field' };
    case '23514': // check_violation
      return { statusCode: 400, message: 'Validation failed' };
    case '22P02': // invalid_text_representation (e.g. invalid uuid)
      return { statusCode: 400, message: 'Invalid resource identifier' };
    case '22001': // string_data_right_truncation
      return { statusCode: 400, message: 'Field value too long' };
    default:
      return null;
  }
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof multer.MulterError) {
    logger.error({ code: err.code, message: err.message }, 'Multer error');
    let message: string;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large — max 5 MB allowed';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files — only 1 allowed';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected field name';
    else message = `Upload error: ${err.message}`;

    const body: ApiResponse<never> = { success: false, message } as ApiResponse<never>;
    res.status(400).json(body);
    return;
  }

  const error = err as AppError;

  logger.error({ err: error }, 'Unhandled error');

  let statusCode = error.statusCode ?? 500;
  let message = error.isOperational ? error.message : 'Internal server error';
  const errors = error.errors;

  if (error.message === 'UNSUPPORTED_MIME') {
    statusCode = 400;
    message = 'Unsupported file type — only JPEG, PNG, and WebP are allowed';
  }

  if (isPostgresError(err)) {
    const mapped = mapPostgresError(err);
    if (mapped) {
      statusCode = mapped.statusCode;
      message = mapped.message;
    } else {
      // Unknown SQLSTATE — log internally but don't leak to client
      statusCode = 500;
      message = 'Internal server error';
    }
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authenticated';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired, please login again';
  }

  const body: ApiResponse<never> = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' &&
      statusCode === 500 && { stack: error.stack }),
  } as ApiResponse<never>;

  res.status(statusCode).json(body);
};
