import { Router } from 'express';
import { protect, registeredOnly, adminOnly } from '../middleware/authMiddleware.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../validators/authValidators.js';
import {
  adminUsersQueryValidator,
  adminUserIdValidator,
  updateRoleValidator,
  deleteUserValidator,
  roomCodeValidator,
  adminMatchesQueryValidator,
} from '../validators/adminValidators.js';
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getActiveRooms,
  forceCloseRoom,
  getRecentMatches,
} from '../controllers/adminController.js';

const router = Router();

router.use(protect, registeredOnly, adminOnly, adminLimiter);

router.get('/stats', getDashboardStats);
router.get('/users', adminUsersQueryValidator, validate, getUsers);
router.get('/users/:id', adminUserIdValidator, validate, getUserById);
router.patch('/users/:id/role', updateRoleValidator, validate, updateUserRole);
router.delete('/users/:id', deleteUserValidator, validate, deleteUser);
router.get('/rooms', getActiveRooms);
router.delete('/rooms/:roomCode', roomCodeValidator, validate, forceCloseRoom);
router.get('/matches', adminMatchesQueryValidator, validate, getRecentMatches);

export default router;
