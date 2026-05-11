const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);
