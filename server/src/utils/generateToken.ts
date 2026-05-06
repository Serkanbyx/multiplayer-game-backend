import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/env.js';
import type { JwtPayload } from '@mpg/shared/types/auth.js';

export const generateToken = (payload: JwtPayload): string => {
  const expiresIn: StringValue = (
    payload.isGuest ? env.GUEST_JWT_EXPIRES_IN : env.JWT_EXPIRES_IN
  ) as StringValue;

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};
