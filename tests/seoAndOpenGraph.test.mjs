import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

test('SEO: index.html contains complete Open Graph, WhatsApp fallback and Twitter Card metadata', () => {
  const indexPath = path.join(projectRoot, 'index.html');
  assert.ok(fs.existsSync(indexPath), 'index.html deve existir');

  const html = fs.readFileSync(indexPath, 'utf8');

  // Title & Description
  assert.match(html, /<title>Mirio — Ideias visuais em tempo real<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]*"/);

  // Open Graph
  assert.match(html, /<meta property="og:title" content="Mirio — Ideias visuais em tempo real" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/mirio-wb\.vercel\.app\/og\.png" \/>/);
  assert.match(html, /<meta property="og:image:secure_url" content="https:\/\/mirio-wb\.vercel\.app\/og\.png" \/>/);
  assert.match(html, /<meta property="og:image:width" content="1200" \/>/);
  assert.match(html, /<meta property="og:image:height" content="630" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/mirio-wb\.vercel\.app\/" \/>/);
  assert.match(html, /<meta property="og:type" content="website" \/>/);

  // WhatsApp Fallback
  assert.match(html, /<link rel="image_src" href="https:\/\/mirio-wb\.vercel\.app\/og\.png" \/>/);

  // Twitter Cards
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/mirio-wb\.vercel\.app\/og\.png" \/>/);

  // Canonical & JSON-LD
  assert.match(html, /<link rel="canonical" href="https:\/\/mirio-wb\.vercel\.app\/" \/>/);
  assert.match(html, /"applicationCategory": "DesignApplication, CollaborationApplication"/);
});

test('GEO: index.html contains complete GEO geotagging and internationalization metadata', () => {
  const indexPath = path.join(projectRoot, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Geotagging
  assert.match(html, /<meta name="geo\.region" content="BR" \/>/);
  assert.match(html, /<meta name="geo\.placename" content="Brasil" \/>/);
  assert.match(html, /<meta name="geo\.position" content="[^"]*" \/>/);
  assert.match(html, /<meta name="ICBM" content="[^"]*" \/>/);
  assert.match(html, /<meta name="language" content="Portuguese" \/>/);
  assert.match(html, /<link rel="alternate" hreflang="pt-BR" href="https:\/\/mirio-wb\.vercel\.app\/" \/>/);
});

test('Open Graph: public/og.png is valid, non-empty and has exact 1200x630 dimensions', () => {
  const ogPath = path.join(projectRoot, 'public', 'og.png');
  assert.ok(fs.existsSync(ogPath), 'public/og.png deve existir');

  const buf = fs.readFileSync(ogPath);
  assert.ok(buf.length > 10000, 'public/og.png deve ter conteúdo de imagem significativo');

  // Validar cabeçalho PNG
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  assert.ok(isPng, 'Arquivo deve ser um PNG válido');

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.equal(width, 1200, 'Largura deve ser exatamente 1200px');
  assert.equal(height, 630, 'Altura deve ser exatamente 630px');
});

test('Generator: scripts/generate-og.mjs exists and npm script is configured', () => {
  const scriptPath = path.join(projectRoot, 'scripts', 'generate-og.mjs');
  assert.ok(fs.existsSync(scriptPath), 'scripts/generate-og.mjs deve existir');

  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['generate:og'], 'node scripts/generate-og.mjs');
});
