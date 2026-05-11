import { describe, it, expect } from 'vitest';
import { shuffle } from '../shuffle.js';

describe('shuffle', () => {
  const input = Array.from({ length: 52 }, (_, i) => i);

  it('should return an array of the same length', () => {
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
  });

  it('should contain the same elements as the input', () => {
    const result = shuffle(input);
    expect(result.sort((a, b) => a - b)).toEqual(input);
  });

  it('should not mutate the original array', () => {
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('should produce a different order at least once across multiple calls (statistical)', () => {
    const attempts = 10;
    let allSame = true;

    for (let i = 0; i < attempts; i++) {
      const result = shuffle(input);
      if (result.some((val, idx) => val !== input[idx])) {
        allSame = false;
        break;
      }
    }

    expect(allSame).toBe(false);
  });

  it('should handle empty arrays', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('should handle single-element arrays', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});
