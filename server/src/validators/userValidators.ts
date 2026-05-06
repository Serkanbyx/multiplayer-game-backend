import { param, query, body, type ValidationChain } from 'express-validator';

/* ------------------------------------------------------------------ */
/*  :username param                                                    */
/* ------------------------------------------------------------------ */

export const usernameParamValidator: ValidationChain[] = [
  param('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3–20 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can only contain lowercase letters, numbers and underscores'),
];

/* ------------------------------------------------------------------ */
/*  Pagination query params                                            */
/* ------------------------------------------------------------------ */

export const paginationValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
];

/* ------------------------------------------------------------------ */
/*  PATCH /me — profil güncelleme (whitelist)                          */
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
];
