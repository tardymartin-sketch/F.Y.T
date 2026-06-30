import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('renvoie une chaîne vide pour une entrée vide', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('laisse passer le HTML inoffensif', () => {
    const html = '<p>Bonjour <strong>Martin</strong></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('retire les balises <script>', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert("xss")</script>');
    expect(out).toBe('<p>ok</p>');
    expect(out).not.toContain('script');
  });

  it('retire les <script> multi-lignes et avec attributs', () => {
    const out = sanitizeHtml('<script src="evil.js">\nmalicious();\n</script><span>safe</span>');
    expect(out).toContain('<span>safe</span>');
    expect(out.toLowerCase()).not.toContain('malicious');
  });

  it('retire les handlers inline (double quotes)', () => {
    const out = sanitizeHtml('<img src="x" onerror="steal()">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('steal()');
  });

  it('retire les handlers inline (single quotes)', () => {
    const out = sanitizeHtml("<div onclick='hack()'>x</div>");
    expect(out).not.toContain('onclick');
  });

  it('neutralise les liens javascript: (double quotes)', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">clic</a>');
    expect(out).toContain('href="#"');
    expect(out).not.toContain('javascript:');
  });

  it('neutralise les liens javascript: (single quotes)', () => {
    const out = sanitizeHtml("<a href='javascript:alert(1)'>clic</a>");
    expect(out).toContain("href='#'");
    expect(out).not.toContain('javascript:');
  });

  it('préserve les liens http légitimes', () => {
    const html = '<a href="https://fyt.app">site</a>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});
