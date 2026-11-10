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

test('Adaptive Open Graph: public/og-dark.png and public/og-light.png exist and have exact 1200x630 dimensions', () => {
  const darkPath = path.join(projectRoot, 'public', 'og-dark.png');
  const lightPath = path.join(projectRoot, 'public', 'og-light.png');

  assert.ok(fs.existsSync(darkPath), 'public/og-dark.png deve existir');
  assert.ok(fs.existsSync(lightPath), 'public/og-light.png deve existir');

  const darkBuf = fs.readFileSync(darkPath);
  const lightBuf = fs.readFileSync(lightPath);

  assert.ok(darkBuf.length > 10000, 'og-dark.png deve ter conteúdo significativo');
  assert.ok(lightBuf.length > 10000, 'og-light.png deve ter conteúdo significativo');

  assert.equal(darkBuf.readUInt32BE(16), 1200, 'og-dark.png largura deve ser 1200px');
  assert.equal(darkBuf.readUInt32BE(20), 630, 'og-dark.png altura deve ser 630px');

  assert.equal(lightBuf.readUInt32BE(16), 1200, 'og-light.png largura deve ser 1200px');
  assert.equal(lightBuf.readUInt32BE(20), 630, 'og-light.png altura deve ser 630px');
});

test('Dynamic Theme Sync: ThemeContext and api/og.js handle theme-adaptive social sharing', () => {
  const themeContextPath = path.join(projectRoot, 'src', 'context', 'ThemeContext.tsx');
  const themeContextContent = fs.readFileSync(themeContextPath, 'utf8');

  assert.ok(themeContextContent.includes('og-dark.png'), 'ThemeContext deve referenciar og-dark.png');
  assert.ok(themeContextContent.includes('og-light.png'), 'ThemeContext deve referenciar og-light.png');
  assert.ok(themeContextContent.includes('meta[property="og:image"]'), 'ThemeContext deve atualizar og:image dinamicamente no DOM');

  const apiOgPath = path.join(projectRoot, 'api', 'og.js');
  assert.ok(fs.existsSync(apiOgPath), 'api/og.js endpoint deve existir');

  const apiOgContent = fs.readFileSync(apiOgPath, 'utf8');
  assert.ok(apiOgContent.includes('og-light.png') && apiOgContent.includes('og-dark.png'), 'api/og.js deve suportar redirecionamento dinâmico para ambos os temas');
});

test('Favicon: public/favicon.svg and raster fallbacks exist and represent Mirio logo', () => {
  const svgPath = path.join(projectRoot, 'public', 'favicon.svg');
  assert.ok(fs.existsSync(svgPath), 'public/favicon.svg deve existir');

  const svgContent = fs.readFileSync(svgPath, 'utf8');
  assert.ok(svgContent.includes('image/png;base64'), 'favicon.svg deve incorporar a logo oficial em alta resolução');
  assert.ok(svgContent.includes('prefers-color-scheme: dark'), 'favicon.svg deve suportar tema claro e escuro');

  const icoPath = path.join(projectRoot, 'public', 'favicon.ico');
  assert.ok(fs.existsSync(icoPath), 'public/favicon.ico deve existir');

  const png32Path = path.join(projectRoot, 'public', 'favicon-32x32.png');
  assert.ok(fs.existsSync(png32Path), 'public/favicon-32x32.png deve existir');

  const appleTouchPath = path.join(projectRoot, 'public', 'apple-touch-icon.png');
  assert.ok(fs.existsSync(appleTouchPath), 'public/apple-touch-icon.png deve existir');
});

test('Generator: scripts/generate-og.mjs exists and npm script is configured', () => {
  const scriptPath = path.join(projectRoot, 'scripts', 'generate-og.mjs');
  assert.ok(fs.existsSync(scriptPath), 'scripts/generate-og.mjs deve existir');

  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['generate:og'], 'node scripts/generate-og.mjs');
});
