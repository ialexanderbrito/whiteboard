import test from 'node:test';
import assert from 'node:assert/strict';

// Importa o handler serverless
import handler from '../api/html.js';

function createMockReqRes(headers = {}, query = {}) {
  const req = {
    headers,
    query
  };

  let statusCode = 200;
  let responseHeaders = {};
  let body = '';

  const res = {
    writeHead(code, headersObj) {
      statusCode = code;
      responseHeaders = { ...headersObj };
      return this;
    },
    end(data) {
      body = data || '';
      return this;
    }
  };

  return { req, res, getStatus: () => statusCode, getHeaders: () => responseHeaders, getBody: () => body };
}

test('api/html: rejects malicious Host / X-Forwarded-Host injection and prevents XSS / Cache Poisoning', () => {
  const { req, res, getBody, getHeaders } = createMockReqRes({
    'x-forwarded-host': 'evil.com"><script>alert(1)</script>',
    'x-forwarded-proto': 'https'
  }, { theme: 'dark' });

  handler(req, res);

  const html = getBody();
  const headers = getHeaders();

  // Garante que o payload XSS NÃO foi injetado sem sanitização
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('evil.com'), false);

  // Garante que o host padrão oficial seguro foi utilizado
  assert.match(html, /https:\/\/mirio-wb\.vercel\.app\/og-dark\.png/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

test('api/html: accepts legitimate vercel.app preview host and official mirio domain', () => {
  const { req, res, getBody } = createMockReqRes({
    'x-forwarded-host': 'mirio-wb-git-feat-preview.vercel.app',
    'x-forwarded-proto': 'https'
  }, { theme: 'light' });

  handler(req, res);

  const html = getBody();
  assert.match(html, /https:\/\/mirio-wb-git-feat-preview\.vercel\.app\/og-light\.png/);
});
