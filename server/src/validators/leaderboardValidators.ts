import { query, type ValidationChain } from 'express-validator';

/* ------------------------------------------------------------------ */
/*  GET /api/leaderboard — query params                                */
/* ------------------------------------------------------------------ */

export const leaderboardValidator: ValidationChain[] = [
  query('gameType')
    .optional()
    .isIn(['tictactoe', 'battleship'])
    .withMessage('gameType must be tictactoe or battleship'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];
