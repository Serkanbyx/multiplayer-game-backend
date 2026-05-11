import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../escapeHtml.js';

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('should escape less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('should escape all entities in one string', () => {
    expect(escapeHtml('<div class="a">&\'b\'</div>')).toBe(
      '&lt;div class=&quot;a&quot;&gt;&amp;&#39;b&#39;&lt;/div&gt;',
    );
  });

  it('should leave normal strings untouched', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('foo 123 bar')).toBe('foo 123 bar');
    expect(escapeHtml('')).toBe('');
  });

  it('should handle XSS payloads', () => {
    const xss = '<img src=x onerror="alert(1)">';
    const result = escapeHtml(xss);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('"');
  });
});
