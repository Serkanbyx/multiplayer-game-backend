import { Router } from 'express';
import {
  register,
  login,
  loginAsGuest,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/authController.js';
import { protect, registeredOnly } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import {
  registerValidator,
  loginValidator,
  guestLoginValidator,
  updateProfileValidator,
  changePasswordValidator,
  deleteAccountValidator,
  validate,
} from '../validators/authValidators.js';

const router = Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/guest', authLimiter, guestLoginValidator, validate, loginAsGuest);

router.get('/me', protect, registeredOnly, getMe);
router.put('/me', protect, registeredOnly, updateProfileValidator, validate, updateProfile);
router.put('/me/password', protect, registeredOnly, changePasswordValidator, validate, changePassword);
router.delete('/me', protect, registeredOnly, deleteAccountValidator, validate, deleteAccount);

export default router;
