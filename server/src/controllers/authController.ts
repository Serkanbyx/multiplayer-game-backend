import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import User, { type IUser } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { RegisteredJwtPayload, GuestJwtPayload } from '@mpg/shared/types/auth.js';

/* ------------------------------------------------------------------ */
/*  POST /api/auth/register                                            */
/* ------------------------------------------------------------------ */

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, email, password, displayName } = req.body as Pick<
      IUser,
      'username' | 'email' | 'password' | 'displayName'
    >;

    const existing = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existing) {
      sendError(res, 'Username or email already in use', 409);
      return;
    }

    const user = await User.create({ username, email, password, displayName });

    const payload: RegisteredJwtPayload = {
      id: String(user._id),
      role: user.role,
      isGuest: false,
    };
    const token = generateToken(payload);

    sendSuccess(res, { user: user.toJSON(), token }, 'Registration successful', 201);
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
    const { email, password } = req.body as Pick<IUser, 'email' | 'password'>;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const payload: RegisteredJwtPayload = {
      id: String(user._id),
      role: user.role,
      isGuest: false,
    };
    const token = generateToken(payload);

    sendSuccess(res, { user: user.toJSON(), token }, 'Login successful');
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
    const user = await User.findById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    sendSuccess(res, { user: user.toJSON() });
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
    const { displayName, bio, avatarUrl } = req.body as Pick<
      IUser,
      'displayName' | 'bio' | 'avatarUrl'
    >;

    const user = await User.findById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();
    sendSuccess(res, { user: user.toJSON() }, 'Profile updated');
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

    const user = await User.findById(req.user!._id).select('+password');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect', 401);
      return;
    }

    user.password = newPassword;
    await user.save();

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

    const user = await User.findById(req.user!._id).select('+password');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Password is incorrect', 401);
      return;
    }

    await user.deleteOne();

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

    const payload: GuestJwtPayload = {
      id: guestId,
      role: 'player',
      isGuest: true,
      displayName: displayName.trim(),
    };
    const token = generateToken(payload);

    sendSuccess(
      res,
      {
        user: { _id: guestId, displayName: displayName.trim(), isGuest: true, role: 'player' },
        token,
      },
      'Guest login successful',
      201,
    );
  } catch (err) {
    next(err);
  }
};
