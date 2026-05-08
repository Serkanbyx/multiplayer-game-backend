import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../validators/authValidators.js';
import { leaderboardValidator } from '../validators/leaderboardValidators.js';

const router = Router();

router.get('/', optionalAuth, leaderboardValidator, validate, getLeaderboard);

export default router;
