import { describe, it, expect } from 'vitest';
import {
  validateRoomCreatePayload,
  validateRoomJoinPayload,
  validateChatPayload,
  validateGameActionPayload,
  validateMatchmakingJoin,
} from '../socketValidators.js';

/* ─── room:create ──────────────────────────────────────────────── */

describe('validateRoomCreatePayload', () => {
  it('should accept valid payload', () => {
    const result = validateRoomCreatePayload({ gameType: 'tictactoe', isPrivate: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ gameType: 'tictactoe', isPrivate: false });
    }
  });

  it('should accept cardgame type', () => {
    const result = validateRoomCreatePayload({ gameType: 'cardgame', isPrivate: true });
    expect(result.ok).toBe(true);
  });

  it('should reject non-object payload', () => {
    const result = validateRoomCreatePayload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject invalid game type', () => {
    const result = validateRoomCreatePayload({ gameType: 'chess', isPrivate: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_GAME_TYPE');
  });

  it('should reject non-boolean isPrivate', () => {
    const result = validateRoomCreatePayload({ gameType: 'tictactoe', isPrivate: 'yes' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject missing gameType', () => {
    const result = validateRoomCreatePayload({ isPrivate: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_GAME_TYPE');
  });
});

/* ─── room:join ────────────────────────────────────────────────── */

describe('validateRoomJoinPayload', () => {
  it('should accept valid payload', () => {
    const result = validateRoomJoinPayload({ roomCode: 'ab12cd34', asSpectator: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ roomCode: 'ab12cd34', asSpectator: false });
    }
  });

  it('should default asSpectator to false when omitted', () => {
    const result = validateRoomJoinPayload({ roomCode: 'ab12cd34' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.asSpectator).toBe(false);
  });

  it('should reject non-object payload', () => {
    const result = validateRoomJoinPayload('ab12cd34');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject invalid room code format', () => {
    const result = validateRoomJoinPayload({ roomCode: 'INVALID!', asSpectator: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_ROOM_CODE');
  });

  it('should reject room code with wrong length', () => {
    const result = validateRoomJoinPayload({ roomCode: 'abc', asSpectator: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_ROOM_CODE');
  });

  it('should reject non-boolean asSpectator', () => {
    const result = validateRoomJoinPayload({ roomCode: 'ab12cd34', asSpectator: 'yes' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });
});

/* ─── chat:message ─────────────────────────────────────────────── */

describe('validateChatPayload', () => {
  it('should accept valid message', () => {
    const result = validateChatPayload({ message: 'Hello!' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.message).toBe('Hello!');
  });

  it('should trim whitespace', () => {
    const result = validateChatPayload({ message: '  Hello!  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.message).toBe('Hello!');
  });

  it('should escape HTML entities', () => {
    const result = validateChatPayload({ message: '<script>alert(1)</script>' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.message).not.toContain('<');
      expect(result.value.message).not.toContain('>');
    }
  });

  it('should reject non-object payload', () => {
    const result = validateChatPayload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject non-string message', () => {
    const result = validateChatPayload({ message: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject empty message', () => {
    const result = validateChatPayload({ message: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject message longer than 300 chars', () => {
    const result = validateChatPayload({ message: 'a'.repeat(301) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });
});

/* ─── game:action ──────────────────────────────────────────────── */

describe('validateGameActionPayload', () => {
  it('should accept valid payload', () => {
    const result = validateGameActionPayload({ action: 'play', payload: { index: 4 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ action: 'play', payload: { index: 4 } });
    }
  });

  it('should reject non-object payload', () => {
    const result = validateGameActionPayload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject empty action string', () => {
    const result = validateGameActionPayload({ action: '', payload: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject non-string action', () => {
    const result = validateGameActionPayload({ action: 42, payload: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject array payload', () => {
    const result = validateGameActionPayload({ action: 'play', payload: [1, 2] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject null inner payload', () => {
    const result = validateGameActionPayload({ action: 'play', payload: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });
});

/* ─── matchmaking:join ─────────────────────────────────────────── */

describe('validateMatchmakingJoin', () => {
  it('should accept valid payload', () => {
    const result = validateMatchmakingJoin({ gameType: 'tictactoe' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ gameType: 'tictactoe' });
  });

  it('should accept cardgame', () => {
    const result = validateMatchmakingJoin({ gameType: 'cardgame' });
    expect(result.ok).toBe(true);
  });

  it('should reject non-object payload', () => {
    const result = validateMatchmakingJoin(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_PAYLOAD');
  });

  it('should reject invalid game type', () => {
    const result = validateMatchmakingJoin({ gameType: 'chess' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_GAME_TYPE');
  });
});
