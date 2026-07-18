import { param, query, type ValidationChain } from 'express-validator';

/* ------------------------------------------------------------------ */
/*  :id param — UUID format                                            */
/* ------------------------------------------------------------------ */

export const uuidParamValidator: ValidationChain[] = [
  param('id')
    .isUUID(4)
    .withMessage('ID must be a valid UUID'),
];

/* ------------------------------------------------------------------ */
/*  ?gameType filter                                                   */
/* ------------------------------------------------------------------ */

export const gameTypeFilterValidator: ValidationChain[] = [
  query('gameType')
    .optional()
    .isIn(['tictactoe', 'battleship'])
    .withMessage('gameType must be tictactoe or battleship'),
];
