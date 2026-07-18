import { body, param, query, type ValidationChain } from 'express-validator';
import { escapeRegex } from '../utils/escapeRegex.js';

/* ------------------------------------------------------------------ */
/*  Pagination + search for GET /api/admin/users                       */
/* ------------------------------------------------------------------ */

export const adminUsersQueryValidator: ValidationChain[] = [
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
  query('search')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Search query must be at most 100 characters')
    .customSanitizer((value) => escapeRegex(value)),
  query('role')
    .optional()
    .isIn(['player', 'admin'])
    .withMessage('Role must be player or admin'),
];

/* ------------------------------------------------------------------ */
/*  User search (escape + regex-escape via customSanitizer)            */
/* ------------------------------------------------------------------ */

export const userSearchValidator: ValidationChain[] = [
  query('search')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Search query must be at most 100 characters')
    .customSanitizer((value) => escapeRegex(value)),
];

/* ------------------------------------------------------------------ */
/*  :id param — UUID format                                            */
/* ------------------------------------------------------------------ */

export const userIdParamValidator: ValidationChain[] = [
  param('id')
    .isUUID(4)
    .withMessage('User ID must be a valid UUID'),
];

export const adminUserIdValidator = userIdParamValidator;

/* ------------------------------------------------------------------ */
/*  PATCH /api/admin/users/:id/role — update role                      */
/* ------------------------------------------------------------------ */

export const updateRoleValidator: ValidationChain[] = [
  param('id')
    .isUUID(4)
    .withMessage('User ID must be a valid UUID'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['player', 'admin'])
    .withMessage('Role must be player or admin'),
];

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/users/:id — delete user                          */
/* ------------------------------------------------------------------ */

export const deleteUserValidator: ValidationChain[] = [
  param('id')
    .isUUID(4)
    .withMessage('User ID must be a valid UUID'),
];

/* ------------------------------------------------------------------ */
/*  :roomCode param for room operations                                */
/* ------------------------------------------------------------------ */

export const roomCodeValidator: ValidationChain[] = [
  param('roomCode')
    .trim()
    .isLength({ min: 1, max: 36 })
    .withMessage('Room code is required and must be at most 36 characters'),
];

/* ------------------------------------------------------------------ */
/*  Pagination for GET /api/admin/matches                              */
/* ------------------------------------------------------------------ */

export const adminMatchesQueryValidator: ValidationChain[] = [
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
  query('gameType')
    .optional()
    .isIn(['tictactoe', 'battleship'])
    .withMessage('gameType must be tictactoe or battleship'),
];
