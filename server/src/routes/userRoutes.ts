import { Router } from 'express';
import {
  getPublicProfile,
  getMyProfile,
  updateMyProfile,
  getUserMatches,
  uploadAvatarHandler,
  removeAvatar,
} from '../controllers/userController.js';
import { protect, optionalAuth, registeredOnly } from '../middleware/authMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';
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
router.post('/me/avatar', protect, registeredOnly, uploadLimiter, uploadAvatar, uploadAvatarHandler);
router.delete('/me/avatar', protect, registeredOnly, removeAvatar);

router.get('/:username', optionalAuth, usernameParamValidator, validate, getPublicProfile);
router.get('/:username/matches', optionalAuth, usernameParamValidator, paginationValidator, validate, getUserMatches);

export default router;
