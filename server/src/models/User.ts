import { Schema, model, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import type {
  GameStats,
  UserPreferences,
  NotificationPreferences,
  PrivacyPreferences,
} from '@mpg/shared/types/user.js';

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  displayName: string;
  avatarUrl: string;
  role: 'player' | 'admin';
  isGuest: boolean;
  bio: string;
  stats: GameStats;
  statsByGame: Map<string, GameStats>;
  preferences: UserPreferences;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/*  Sub-schemas                                                        */
/* ------------------------------------------------------------------ */

const gameStatsSchema = new Schema<GameStats>(
  {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
  },
  { _id: false },
);

const notificationPreferencesSchema = new Schema<NotificationPreferences>(
  {
    matchInvite: { type: Boolean, default: true },
    rematch: { type: Boolean, default: true },
  },
  { _id: false },
);

const privacyPreferencesSchema = new Schema<PrivacyPreferences>(
  {
    showStats: { type: Boolean, default: true },
    showOnLeaderboard: { type: Boolean, default: true },
  },
  { _id: false },
);

const preferencesSchema = new Schema<UserPreferences>(
  {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    animations: { type: Boolean, default: true },
    sounds: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    notifications: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    privacy: {
      type: privacyPreferencesSchema,
      default: () => ({}),
    },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/*  User schema                                                        */
/* ------------------------------------------------------------------ */

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [30, 'Display name must be at most 30 characters'],
    },
    avatarUrl: { type: String, default: '' },
    role: {
      type: String,
      enum: ['player', 'admin'],
      default: 'player',
    },
    isGuest: { type: Boolean, default: false },
    bio: {
      type: String,
      default: '',
      maxlength: [200, 'Bio must be at most 200 characters'],
    },
    stats: {
      type: gameStatsSchema,
      default: () => ({ wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }),
    },
    statsByGame: {
      type: Map,
      of: gameStatsSchema,
      default: () => new Map(),
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                            */
/* ------------------------------------------------------------------ */

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'stats.wins': -1 });

/* ------------------------------------------------------------------ */
/*  Pre-save password hash                                             */
/* ------------------------------------------------------------------ */

userSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ------------------------------------------------------------------ */
/*  Instance method                                                    */
/* ------------------------------------------------------------------ */

userSchema.methods.comparePassword = async function (
  plain: string,
): Promise<boolean> {
  return bcrypt.compare(plain, this.password);
};

/* ------------------------------------------------------------------ */
/*  JSON transform — password'ü yanıtlardan sil                       */
/* ------------------------------------------------------------------ */

userSchema.set('toJSON', {
  transform(_doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.password;
    delete obj.__v;
    return obj;
  },
});

const User = model<IUser>('User', userSchema);
export default User;
