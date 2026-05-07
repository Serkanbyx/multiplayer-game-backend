import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { GameStats, UserPreferences } from '@mpg/shared/types/user.js';
import type { GameType } from '@mpg/shared/types/games.js';
import type {
  MatchPlayerSnapshot,
  MatchResult,
  MatchMove,
} from '@mpg/shared/types/match.js';

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_GAME_STATS: GameStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  gamesPlayed: 0,
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontSize: 'medium',
  animations: true,
  sounds: true,
  soundVolume: 0.7,
  language: 'en',
  notifications: { matchInvite: true, rematch: true },
  privacy: { showStats: true, showOnLeaderboard: true },
};

/* ------------------------------------------------------------------ */
/*  users                                                              */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 20 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 30 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }).notNull().default(''),
    role: varchar('role', { length: 10 })
      .$type<'player' | 'admin'>()
      .notNull()
      .default('player'),
    isGuest: boolean('is_guest').notNull().default(false),
    bio: varchar('bio', { length: 200 }).notNull().default(''),
    stats: jsonb('stats').$type<GameStats>().notNull().default(DEFAULT_GAME_STATS),
    statsByGame: jsonb('stats_by_game')
      .$type<Partial<Record<GameType, GameStats>>>()
      .notNull()
      .default({}),
    preferences: jsonb('preferences')
      .$type<UserPreferences>()
      .notNull()
      .default(DEFAULT_USER_PREFERENCES),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    statsWinsIdx: index('users_stats_wins_idx').on(sql`((${t.stats}->>'wins')::int)`),
    roleIdx: index('users_role_idx').on(t.role),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

/**
 * Public-safe column projection — never selects `password`.
 * Use as: `db.select(usersPublicSelect).from(users)`.
 */
export const usersPublicSelect = {
  id: users.id,
  username: users.username,
  email: users.email,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  role: users.role,
  isGuest: users.isGuest,
  bio: users.bio,
  stats: users.stats,
  statsByGame: users.statsByGame,
  preferences: users.preferences,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export type PublicUserRow = {
  [K in keyof typeof usersPublicSelect]: UserRow[K];
};

/* ------------------------------------------------------------------ */
/*  matches                                                            */
/* ------------------------------------------------------------------ */

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomCode: varchar('room_code', { length: 36 }).notNull(),
    gameType: varchar('game_type', { length: 20 }).$type<GameType>().notNull(),
    players: jsonb('players').$type<MatchPlayerSnapshot[]>().notNull(),
    result: jsonb('result').$type<MatchResult>().notNull(),
    moves: jsonb('moves').$type<MatchMove[]>().notNull().default([]),
    duration: integer('duration').notNull().default(0),
    totalRounds: integer('total_rounds').notNull().default(1),
    winnerUserId: uuid('winner_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    winnerIdx: index('matches_winner_idx').on(t.winnerUserId, t.createdAt),
    gameCreatedIdx: index('matches_game_created_idx').on(t.gameType, t.createdAt),
    roomCodeIdx: index('matches_room_code_idx').on(t.roomCode),
  }),
);

export type MatchRow = typeof matches.$inferSelect;
export type NewMatchRow = typeof matches.$inferInsert;
