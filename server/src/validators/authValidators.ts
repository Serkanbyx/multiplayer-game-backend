import { body, type ValidationChain } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

/* ------------------------------------------------------------------ */
/*  Genel validate middleware                                           */
/* ------------------------------------------------------------------ */

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: 'path' in e ? (e.path as string) : 'unknown',
      message: e.msg as string,
    }));
    sendError(res, 'Validation failed', 400, formatted);
    return;
  }
  next();
};

/* ------------------------------------------------------------------ */
/*  Register                                                           */
/* ------------------------------------------------------------------ */

export const registerValidator: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3–20 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can only contain lowercase letters, numbers and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Display name must be 2–30 characters'),
];

/* ------------------------------------------------------------------ */
/*  Login                                                              */
/* ------------------------------------------------------------------ */

export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/* ------------------------------------------------------------------ */
/*  Update profile                                                     */
/* ------------------------------------------------------------------ */

export const updateProfileValidator: ValidationChain[] = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Display name must be 2–30 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio must be at most 200 characters'),
  body('avatarUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar URL must be a valid URL'),
];

/* ------------------------------------------------------------------ */
/*  Change password                                                    */
/* ------------------------------------------------------------------ */

export const changePasswordValidator: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

/* ------------------------------------------------------------------ */
/*  Delete account                                                     */
/* ------------------------------------------------------------------ */

export const deleteAccountValidator: ValidationChain[] = [
  body('password')
    .notEmpty()
    .withMessage('Password confirmation is required'),
];

/* ------------------------------------------------------------------ */
/*  Guest login                                                        */
/* ------------------------------------------------------------------ */

export const guestLoginValidator: ValidationChain[] = [
  body('displayName')
    .trim()
    .escape()
    .isLength({ min: 3, max: 20 })
    .withMessage('Display name must be 3–20 characters'),
];
