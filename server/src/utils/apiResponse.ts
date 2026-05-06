import type { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  } satisfies ApiResponse<T>);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Array<{ field: string; message: string }>,
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  } satisfies ApiResponse<never>);
};
