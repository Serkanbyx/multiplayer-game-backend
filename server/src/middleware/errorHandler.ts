import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import type { ApiResponse } from '../utils/apiResponse.js';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: Array<{ field: string; message: string }>;
  code?: number; // Mongoose duplicate key error code
}

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req,
  res,
  _next,
): void => {
  console.error('Error:', err.message, env.NODE_ENV === 'development' ? err.stack : '');

  let statusCode = err.statusCode ?? 500;
  let message = err.isOperational ? err.message : 'Internal server error';
  let errors = err.errors;

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authenticated';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired, please login again';
  }

  const body: ApiResponse<never> = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && statusCode === 500 && { stack: err.stack }),
  } as ApiResponse<never>;

  res.status(statusCode).json(body);
};
