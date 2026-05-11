import jwt from 'jsonwebtoken';
import type { RegisteredJwtPayload, GuestJwtPayload } from '../../../shared/types/auth.js';

const TEST_SECRET = 'test-secret-key-for-unit-tests-only';

const registeredPayload: RegisteredJwtPayload = {
  id: 'user-1',
  role: 'player',
  isGuest: false,
};

const guestPayload: GuestJwtPayload = {
  id: 'guest-1',
  role: 'player',
  isGuest: true,
  displayName: 'GuestPlayer',
};

const adminPayload: RegisteredJwtPayload = {
  id: 'admin-1',
  role: 'admin',
  isGuest: false,
};

export const validToken = jwt.sign(registeredPayload, TEST_SECRET, { expiresIn: '1h' });
export const guestToken = jwt.sign(guestPayload, TEST_SECRET, { expiresIn: '1h' });
export const adminToken = jwt.sign(adminPayload, TEST_SECRET, { expiresIn: '1h' });
export const expiredToken = jwt.sign(registeredPayload, TEST_SECRET, { expiresIn: '-1s' });

export { TEST_SECRET };
