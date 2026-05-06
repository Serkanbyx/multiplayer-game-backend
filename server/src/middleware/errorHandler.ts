import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import type { ApiResponse } from '../utils/apiResponse.js';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: Array<{ field: string; message: string }>;
  code?: number; // Mongoose duplicate key error code
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Multer errors (file upload) — checked before casting to AppError
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err.code, err.message);
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

  console.error('Error:', error.message, env.NODE_ENV === 'development' ? error.stack : '');

  let statusCode = error.statusCode ?? 500;
  let message = error.isOperational ? error.message : 'Internal server error';
  const errors = error.errors;

  // Custom Multer fileFilter rejection
  if (error.message === 'UNSUPPORTED_MIME') {
    statusCode = 400;
    message = 'Unsupported file type — only JPEG, PNG, and WebP are allowed';
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  // JWT errors
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
    ...(env.NODE_ENV === 'development' && statusCode === 500 && { stack: error.stack }),
  } as ApiResponse<never>;

  res.status(statusCode).json(body);
};
