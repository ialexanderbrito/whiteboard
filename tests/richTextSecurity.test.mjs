import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColor, runsToHtml } from '../src/utils/richText.ts';

test('normalizeColor: sanitizes malicious color payloads and rejects XSS strings', () => {
  const xssPayload = 'red"><img src=x onerror=alert(document.domain)>';
  assert.equal(normalizeColor(xssPayload), undefined);
  assert.equal(normalizeColor('javascript:alert(1)'), undefined);
  assert.equal(normalizeColor('<script>alert(1)</script>'), undefined);
  assert.equal(normalizeColor('red; background: url(evil)'), undefined);
});

test('normalizeColor: accepts legitimate hex, rgb, and named colors', () => {
  assert.equal(normalizeColor('#ff0000'), '#ff0000');
  assert.equal(normalizeColor('#333'), '#333');
  assert.equal(normalizeColor('#334155'), '#334155');
  assert.equal(normalizeColor('rgb(255, 0, 0)'), '#ff0000');
  assert.equal(normalizeColor('rgba(0, 128, 255, 0.5)'), '#0080ff');
  assert.equal(normalizeColor('red'), 'red');
  assert.equal(normalizeColor('blue'), 'blue');
});

test('runsToHtml: escapes run.text and does not inject malicious HTML from color', () => {
  const runs = [
    { text: 'Hello <world>', color: 'red"><img src=x onerror=alert(1)>' }
  ];
  const html = runsToHtml(runs);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('onerror'));
  assert.ok(html.includes('&lt;world&gt;'));
});
