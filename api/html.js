import fs from 'fs';
import path from 'path';

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

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'mirio-wb.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;
  const ogUrl = `${origin}/${ogImageName}`;

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
    'Access-Control-Allow-Origin': '*'
  });
  res.end(modifiedHtml);
}
