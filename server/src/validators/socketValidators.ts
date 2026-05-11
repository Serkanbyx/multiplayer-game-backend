import type { GameType } from '../../../shared/types/games.js';
import { escapeHtml } from '../utils/escapeHtml.js';

/* ─── Discriminated Union Result ──────────────────────────────── */

type ValidatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

/* ─── Allowed Game Types (closed-world whitelist) ─────────────── */

const ALLOWED_GAME_TYPES: readonly GameType[] = ['tictactoe', 'cardgame'];

const isValidGameType = (v: unknown): v is GameType =>
  typeof v === 'string' && ALLOWED_GAME_TYPES.includes(v as GameType);

/* ─── Room Code Pattern ───────────────────────────────────────── */

const ROOM_CODE_RE = /^[a-f0-9]{8}$/;

/* ─── room:create ─────────────────────────────────────────────── */

export const validateRoomCreatePayload = (
  raw: unknown,
): ValidatorResult<{ gameType: GameType; isPrivate: boolean }> => {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Payload must be an object' };

  const data = raw as { gameType?: unknown; isPrivate?: unknown };

  if (!isValidGameType(data.gameType))
    return { ok: false, code: 'INVALID_GAME_TYPE', message: 'Unknown game type' };

  if (typeof data.isPrivate !== 'boolean')
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'isPrivate must be boolean' };

  return { ok: true, value: { gameType: data.gameType, isPrivate: data.isPrivate } };
};

/* ─── room:join ───────────────────────────────────────────────── */

export const validateRoomJoinPayload = (
  raw: unknown,
): ValidatorResult<{ roomCode: string; asSpectator: boolean }> => {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Payload must be an object' };

  const data = raw as { roomCode?: unknown; asSpectator?: unknown };

  if (typeof data.roomCode !== 'string' || !ROOM_CODE_RE.test(data.roomCode))
    return { ok: false, code: 'INVALID_ROOM_CODE', message: 'roomCode must be an 8-char hex string' };

  if (data.asSpectator !== undefined && typeof data.asSpectator !== 'boolean')
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'asSpectator must be boolean' };

  return { ok: true, value: { roomCode: data.roomCode, asSpectator: data.asSpectator ?? false } };
};

/* ─── chat:message ────────────────────────────────────────────── */

export const validateChatPayload = (
  raw: unknown,
): ValidatorResult<{ message: string }> => {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Payload must be an object' };

  const data = raw as { message?: unknown };

  if (typeof data.message !== 'string')
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'message must be a string' };

  const trimmed = data.message.trim();

  if (trimmed.length < 1 || trimmed.length > 300)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Message must be 1–300 characters' };

  return { ok: true, value: { message: escapeHtml(trimmed) } };
};

/* ─── game:action ─────────────────────────────────────────────── */

export const validateGameActionPayload = (
  raw: unknown,
): ValidatorResult<{ action: string; payload: Record<string, unknown> }> => {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Payload must be an object' };

  const data = raw as { action?: unknown; payload?: unknown };

  if (typeof data.action !== 'string' || data.action.trim().length === 0)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'action must be a non-empty string' };

  if (typeof data.payload !== 'object' || data.payload === null || Array.isArray(data.payload))
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'payload must be an object' };

  return {
    ok: true,
    value: { action: data.action, payload: data.payload as Record<string, unknown> },
  };
};

/* ─── matchmaking:join ────────────────────────────────────────── */

export const validateMatchmakingJoin = (
  raw: unknown,
): ValidatorResult<{ gameType: GameType }> => {
  if (typeof raw !== 'object' || raw === null)
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Payload must be an object' };

  const data = raw as { gameType?: unknown };

  if (!isValidGameType(data.gameType))
    return { ok: false, code: 'INVALID_GAME_TYPE', message: 'Unknown game type' };

  return { ok: true, value: { gameType: data.gameType } };
};
