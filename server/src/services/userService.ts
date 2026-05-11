import bcrypt from 'bcryptjs';
import { eq, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  matches,
  usersPublicSelect,
  type UserRow,
  type PublicUserRow,
} from '../db/schema/index.js';
import { env } from '../config/env.js';
import type { UserPreferences } from '@mpg/shared/types/user.js';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role?: 'player' | 'admin';
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizeUsername = (value: string): string => value.trim().toLowerCase();

export const findByEmailWithPassword = async (
  email: string,
): Promise<UserRow | undefined> => {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return row;
};

export const findByIdWithPassword = async (
  id: string,
): Promise<{ id: string; password: string } | undefined> => {
  const [row] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row;
};

export const findExistingByUsernameOrEmail = async (
  username: string,
  email: string,
): Promise<{ id: string } | undefined> => {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        eq(users.username, normalizeUsername(username)),
        eq(users.email, normalizeEmail(email)),
      ),
    )
    .limit(1);
  return row;
};

export const findPublicById = async (
  id: string,
): Promise<PublicUserRow | undefined> => {
  const [row] = await db
    .select(usersPublicSelect)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row;
};

export const findPublicByUsername = async (
  username: string,
): Promise<PublicUserRow | undefined> => {
  const [row] = await db
    .select(usersPublicSelect)
    .from(users)
    .where(eq(users.username, normalizeUsername(username)))
    .limit(1);
  return row;
};

export const createUser = async (input: RegisterInput): Promise<PublicUserRow> => {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(input.password, salt);

  const [row] = await db
    .insert(users)
    .values({
      username: normalizeUsername(input.username),
      email: normalizeEmail(input.email),
      password: passwordHash,
      displayName: input.displayName.trim(),
      role: input.role ?? 'player',
    })
    .returning(usersPublicSelect);

  if (!row) throw new Error('User insert returned no row');
  return row;
};

export const verifyPassword = async (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);

export const updatePasswordById = async (
  userId: string,
  newPassword: string,
): Promise<void> => {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, userId));
};

export const updateLastLogin = async (userId: string): Promise<void> => {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
};

export const updateProfileById = async (
  userId: string,
  patch: {
    displayName?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
  },
): Promise<PublicUserRow> => {
  const fields: Partial<{ displayName: string; bio: string; avatarUrl: string }> = {};
  if (patch.displayName !== undefined) fields.displayName = patch.displayName.trim();
  if (patch.bio !== undefined) fields.bio = patch.bio.trim();
  if (patch.avatarUrl !== undefined) fields.avatarUrl = patch.avatarUrl;

  if (Object.keys(fields).length === 0) {
    const row = await findPublicById(userId);
    if (!row) throw new Error('User not found');
    return row;
  }

  const [row] = await db
    .update(users)
    .set(fields)
    .where(eq(users.id, userId))
    .returning(usersPublicSelect);
  if (!row) throw new Error('User update returned no row');
  return row;
};

export const replacePreferences = async (
  userId: string,
  preferences: UserPreferences,
): Promise<UserPreferences> => {
  const [row] = await db
    .update(users)
    .set({ preferences })
    .where(eq(users.id, userId))
    .returning({ preferences: users.preferences });
  if (!row) throw new Error('Preferences update returned no row');
  return row.preferences;
};

/**
 * Deletes a user and nullifies their references in match history.
 * Match player snapshots preserve `displayName` for historical records.
 */
export const deleteUserById = async (userId: string): Promise<void> => {
  await db
    .update(matches)
    .set({ winnerUserId: null })
    .where(eq(matches.winnerUserId, userId));

  await db.execute(sql`
    UPDATE matches
    SET players = (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'userId' = ${userId}
          THEN jsonb_set(elem, '{userId}', 'null'::jsonb)
          ELSE elem
        END
      )
      FROM jsonb_array_elements(players) AS elem
    )
    WHERE players @> ${JSON.stringify([{ userId }])}::jsonb
  `);

  await db.delete(users).where(eq(users.id, userId));
};

/**
 * Atomically increment user stats after a finished match.
 * Uses jsonb_set + arithmetic so concurrent finishes never lose updates.
 */
export const incrementStats = async (
  userId: string,
  gameType: string,
  outcome: 'wins' | 'losses' | 'draws',
): Promise<void> => {
  const outcomePath = `{${outcome}}`;
  const gameTypePath = `{${gameType}}`;
  const gameOutcomePath = `{${gameType},${outcome}}`;
  const gameGamesPlayedPath = `{${gameType},gamesPlayed}`;

  await db
    .update(users)
    .set({
      stats: sql`jsonb_set(
        jsonb_set(
          ${users.stats},
          '{gamesPlayed}',
          ((COALESCE(${users.stats}->>'gamesPlayed','0'))::int + 1)::text::jsonb
        ),
        ${outcomePath}::text[],
        ((COALESCE(${users.stats}->>${outcome},'0'))::int + 1)::text::jsonb
      )`,
      statsByGame: sql`jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(${users.statsByGame}, '{}'::jsonb),
            ${gameTypePath}::text[],
            COALESCE(${users.statsByGame}->${gameType}, '{"wins":0,"losses":0,"draws":0,"gamesPlayed":0}'::jsonb)
          ),
          ${gameGamesPlayedPath}::text[],
          ((COALESCE(${users.statsByGame}->${gameType}->>'gamesPlayed','0'))::int + 1)::text::jsonb
        ),
        ${gameOutcomePath}::text[],
        ((COALESCE(${users.statsByGame}->${gameType}->>${outcome},'0'))::int + 1)::text::jsonb
      )`,
    })
    .where(eq(users.id, userId));
};

export const upsertAdmin = async (input: RegisterInput): Promise<void> => {
  const existing = await findByEmailWithPassword(input.email);
  if (existing) {
    const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(input.password, salt);
    await db
      .update(users)
      .set({
        username: normalizeUsername(input.username),
        password: passwordHash,
        displayName: input.displayName.trim(),
        role: 'admin',
      })
      .where(eq(users.id, existing.id));
    return;
  }
  await createUser({ ...input, role: 'admin' });
};
