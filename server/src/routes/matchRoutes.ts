import { Router } from 'express';
import { getRecentMatches, getMatchById } from '../controllers/matchController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../validators/authValidators.js';
import { paginationValidator } from '../validators/userValidators.js';
import {
  uuidParamValidator,
  gameTypeFilterValidator,
} from '../validators/matchValidators.js';

const router = Router();

router.get('/', optionalAuth, paginationValidator, gameTypeFilterValidator, validate, getRecentMatches);
router.get('/:id', optionalAuth, uuidParamValidator, validate, getMatchById);

export default router;
