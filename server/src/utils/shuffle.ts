import { randomBytes } from 'node:crypto';

/**
 * Fisher-Yates shuffle seeded by `crypto.randomBytes`.
 * Cryptographically unpredictable — prevents observers from inferring card order.
 */
export const shuffle = <T>(input: readonly T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const rand = randomBytes(4).readUInt32BE(0);
    const j = rand % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};
