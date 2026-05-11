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
/*  PATCH /me — update profile (whitelist)                             */
/* ------------------------------------------------------------------ */

export const updateProfileValidator: ValidationChain[] = [
  body('displayName')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 2, max: 30 })
    .withMessage('Display name must be 2–30 characters'),
  body('bio')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage('Bio must be at most 200 characters'),
];

/* ------------------------------------------------------------------ */
/*  PATCH /me/preferences — update preferences                         */
/* ------------------------------------------------------------------ */

export const preferencesValidator: ValidationChain[] = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark or system'),
  body('fontSize')
    .optional()
    .isIn(['small', 'medium', 'large'])
    .withMessage('Font size must be small, medium or large'),
  body('animations')
    .optional()
    .isBoolean()
    .withMessage('Animations must be a boolean'),
  body('sounds')
    .optional()
    .isBoolean()
    .withMessage('Sounds must be a boolean'),
  body('soundVolume')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Sound volume must be between 0 and 1'),
  body('language')
    .optional()
    .isIn(['en'])
    .withMessage('Unsupported language'),
  body('notifications.matchInvite')
    .optional()
    .isBoolean()
    .withMessage('notifications.matchInvite must be a boolean'),
  body('notifications.rematch')
    .optional()
    .isBoolean()
    .withMessage('notifications.rematch must be a boolean'),
  body('privacy.showStats')
    .optional()
    .isBoolean()
    .withMessage('privacy.showStats must be a boolean'),
  body('privacy.showOnLeaderboard')
    .optional()
    .isBoolean()
    .withMessage('privacy.showOnLeaderboard must be a boolean'),
];
