import { Router } from 'express';
import {
  getPublicProfile,
  getMyProfile,
  updateMyProfile,
  getUserMatches,
} from '../controllers/userController.js';
import { protect, optionalAuth, registeredOnly } from '../middleware/authMiddleware.js';
import { validate } from '../validators/authValidators.js';
import {
  usernameParamValidator,
  paginationValidator,
  updateProfileValidator,
} from '../validators/userValidators.js';

const router = Router();

/* /me route'ları önce tanımlanmalı — yoksa ":username" parametresi "me" stringini yakalar */
router.get('/me', protect, registeredOnly, getMyProfile);
router.patch('/me', protect, registeredOnly, updateProfileValidator, validate, updateMyProfile);

router.get('/:username', optionalAuth, usernameParamValidator, validate, getPublicProfile);
router.get('/:username/matches', optionalAuth, usernameParamValidator, paginationValidator, validate, getUserMatches);

export default router;
