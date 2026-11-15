import fs from 'fs';
import path from 'path';

const ALLOWED_HOSTS = new Set([
  'mirio-wb.vercel.app',
  'mirio.app',
  'localhost',
  'localhost:5173',
  'localhost:3000',
  '127.0.0.1:5173',
  '127.0.0.1:3000'
]);

/**
 * Valida rigorosamente o host contra allowlist oficial e subdomínios Vercel legítimos.
 * Previne Reflected XSS, Host Header Injection e Web Cache Poisoning.
 */
function getSafeHost(req) {
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host;
  if (!rawHost || typeof rawHost !== 'string') {
    return 'mirio-wb.vercel.app';
  }
  const trimmed = rawHost.trim().toLowerCase();
  if (ALLOWED_HOSTS.has(trimmed) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app(?::\d+)?$/i.test(trimmed)) {
    return trimmed;
  }
  return 'mirio-wb.vercel.app';
}

function escapeHtmlAttribute(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function handler(req, res) {
  const queryTheme = req.query?.theme;
  const clientHintTheme = req.headers?.['sec-ch-prefers-color-scheme'];

  const isLight = queryTheme === 'light' || (!queryTheme && clientHintTheme === 'light');
  const theme = isLight ? 'light' : 'dark';
  const ogImageName = isLight ? 'og-light.png' : 'og-dark.png';
  const themeColor = isLight ? '#ffffff' : '#09090b';

  // Localiza o index.html na raiz do projeto ou na pasta dist/
  const candidatePaths = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.resolve('index.html')
  ];

  let rawHtml = '';
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        rawHtml = fs.readFileSync(p, 'utf8');
        break;
      } catch {
        // tenta o próximo candidato
      }
    }
  }

  if (!rawHtml) {
    // Fallback de contingência caso index.html não seja legível
    res.writeHead(302, { Location: `/${ogImageName}` });
    return res.end();
  }

  const safeHost = getSafeHost(req);
  const proto = req.headers['x-forwarded-proto'] === 'http' ? 'http' : 'https';
  const origin = `${proto}://${safeHost}`;
  const rawOgUrl = `${origin}/${ogImageName}`;
  const ogUrl = escapeHtmlAttribute(rawOgUrl);

  // Substituição das metatags para corresponder ao tema dinâmico
  let modifiedHtml = rawHtml
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${ogUrl}" />`
    )
    .replace(
      /<meta property="og:image:secure_url" content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:secure_url" content="${ogUrl}" />`
    )
    .replace(
      /<link rel="image_src" href="[^"]*"\s*\/?>/i,
      `<link rel="image_src" href="${ogUrl}" />`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${ogUrl}" />`
    )
    .replace(
      /<html([^>]*)class="[^"]*"/i,
      `<html$1class="${theme}"`
    );

  // Se a tag html não possuía class, insere a classe correspondente
  if (!/<html[^>]*class=/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<html/i, `<html class="${theme}"`);
  }

  // Atualiza meta theme-color estático padrão
  modifiedHtml = modifiedHtml.replace(
    /<meta name="theme-color" content="#[0-9a-fA-F]{6}" media="\(prefers-color-scheme: (light|dark)\)"\s*\/?>/i,
    `<meta name="theme-color" content="${themeColor}" />`
  );

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    'Vary': 'Sec-CH-Prefers-Color-Scheme',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(modifiedHtml);
}
