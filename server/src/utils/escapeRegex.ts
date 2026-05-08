/**
 * Escapes special regex characters in a string to prevent ReDoS attacks
 * when building dynamic RegExp or PostgreSQL ~ patterns.
 */
export const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Escapes special LIKE/ILIKE characters for safe use in PostgreSQL LIKE patterns.
 */
export const escapeLike = (str: string): string =>
  str.replace(/[%_\\]/g, '\\$&');
