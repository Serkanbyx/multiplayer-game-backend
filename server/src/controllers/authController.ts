import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  findExistingByUsernameOrEmail,
  findByEmailWithPassword,
  findByIdWithPassword,
  findPublicById,
  createUser,
  verifyPassword,
  updatePasswordById,
  updateLastLogin,
  updateProfileById,
  deleteUserById,
} from '../services/userService.js';
import { generateToken } from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type {
  RegisteredJwtPayload,
  GuestJwtPayload,
} from '@mpg/shared/types/auth.js';

/* ------------------------------------------------------------------ */
/*  POST /api/auth/register                                            */
/* ------------------------------------------------------------------ */

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, email, password, displayName } = req.body as {
      username: string;
      email: string;
      password: string;
      displayName: string;
    };

    const existing = await findExistingByUsernameOrEmail(username, email);
    if (existing) {
      sendError(res, 'Username or email already in use', 409);
      return;
    }

    const user = await createUser({ username, email, password, displayName });

    const payload: RegisteredJwtPayload = {
      id: user.id,
      role: user.role,
      isGuest: false,
    };
    const token = generateToken(payload);

    sendSuccess(res, { user, token }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/auth/login                                               */
/* ------------------------------------------------------------------ */

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const userRow = await findByEmailWithPassword(email);
    if (!userRow) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const isMatch = await verifyPassword(password, userRow.password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    await updateLastLogin(userRow.id);

    const payload: RegisteredJwtPayload = {
      id: userRow.id,
      role: userRow.role,
      isGuest: false,
    };
    const token = generateToken(payload);

    const { password: _omit, ...publicUser } = userRow;
    sendSuccess(res, { user: publicUser, token }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/auth/me                                                   */
/* ------------------------------------------------------------------ */

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await findPublicById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  PUT /api/auth/me                                                   */
/* ------------------------------------------------------------------ */

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { displayName, bio, avatarUrl } = req.body as {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    };

    const user = await updateProfileById(req.user!._id, {
      displayName,
      bio,
      avatarUrl,
    });

    sendSuccess(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  PUT /api/auth/me/password                                          */
/* ------------------------------------------------------------------ */

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const row = await findByIdWithPassword(req.user!._id);
    if (!row) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isMatch = await verifyPassword(currentPassword, row.password);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect', 401);
      return;
    }

    await updatePasswordById(req.user!._id, newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE /api/auth/me                                                */
/* ------------------------------------------------------------------ */

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { password } = req.body as { password: string };

    const row = await findByIdWithPassword(req.user!._id);
    if (!row) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isMatch = await verifyPassword(password, row.password);
    if (!isMatch) {
      sendError(res, 'Password is incorrect', 401);
      return;
    }

    await deleteUserById(req.user!._id);
    sendSuccess(res, null, 'Account deleted successfully');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/auth/guest                                               */
/* ------------------------------------------------------------------ */

export const loginAsGuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { displayName } = req.body as { displayName: string };
    const guestId = uuidv4();
    const trimmed = displayName.trim();

    const payload: GuestJwtPayload = {
      id: guestId,
      role: 'player',
      isGuest: true,
      displayName: trimmed,
    };
    const token = generateToken(payload);

    sendSuccess(
      res,
      {
        user: {
          _id: guestId,
          displayName: trimmed,
          isGuest: true,
          role: 'player',
        },
        token,
      },
      'Guest login successful',
      201,
    );
  } catch (err) {
    next(err);
  }
};
