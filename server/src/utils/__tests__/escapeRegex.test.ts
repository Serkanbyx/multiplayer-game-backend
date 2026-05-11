import { describe, it, expect } from 'vitest';
import { escapeRegex, escapeLike } from '../escapeRegex.js';

describe('escapeRegex', () => {
  it('should escape all regex special characters', () => {
    const special = '.*+?^${}()|[]\\';
    const result = escapeRegex(special);

    expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('should leave normal strings untouched', () => {
    expect(escapeRegex('hello')).toBe('hello');
    expect(escapeRegex('foo bar 123')).toBe('foo bar 123');
    expect(escapeRegex('')).toBe('');
  });

  it('should handle mixed content', () => {
    expect(escapeRegex('price: $10.00')).toBe('price: \\$10\\.00');
    expect(escapeRegex('file(1).txt')).toBe('file\\(1\\)\\.txt');
  });

  it('should produce safe RegExp patterns', () => {
    const input = 'test.value+special';
    const pattern = new RegExp(escapeRegex(input));
    expect(pattern.test(input)).toBe(true);
    expect(pattern.test('testXvalue+special')).toBe(false);
  });
});

describe('escapeLike', () => {
  it('should escape LIKE special characters', () => {
    expect(escapeLike('%')).toBe('\\%');
    expect(escapeLike('_')).toBe('\\_');
    expect(escapeLike('\\')).toBe('\\\\');
  });

  it('should leave normal strings untouched', () => {
    expect(escapeLike('hello world')).toBe('hello world');
    expect(escapeLike('')).toBe('');
  });

  it('should handle mixed content', () => {
    expect(escapeLike('100%_done')).toBe('100\\%\\_done');
  });
});
