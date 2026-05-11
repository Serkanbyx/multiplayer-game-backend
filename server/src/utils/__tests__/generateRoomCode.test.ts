import { describe, it, expect } from 'vitest';
import { generateRoomCode } from '../generateRoomCode.js';

describe('generateRoomCode', () => {
  it('should return an 8-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(8);
  });

  it('should contain only hex characters', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[a-f0-9]{8}$/);
  });

  it('should generate unique codes across 10k iterations', () => {
    const codes = new Set<string>();

    for (let i = 0; i < 10_000; i++) {
      codes.add(generateRoomCode());
    }

    expect(codes.size).toBe(10_000);
  });

  it('should consistently return 8-char hex strings', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[a-f0-9]{8}$/);
    }
  });
});
