import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: result.array().map((e) => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })),
  });
};
