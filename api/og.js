import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const queryTheme = req.query?.theme;
  const clientHintTheme = req.headers?.['sec-ch-prefers-color-scheme'];

  const isLight = queryTheme === 'light' || (!queryTheme && clientHintTheme === 'light');
  const filename = isLight ? 'og-light.png' : 'og-dark.png';
  const target = `/${filename}`;

  // Tenta servir os bytes PNG diretamente com status 200 OK (evita 307 que quebra WhatsApp/LinkedIn/Twitter)
  const candidateDirs = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'dist'),
    path.resolve('public')
  ];

  for (const dir of candidateDirs) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': fileBuffer.length,
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
          'Vary': 'Sec-CH-Prefers-Color-Scheme',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(fileBuffer);
      } catch {
        // cai para fallback
      }
    }
  }

  // Redirecionamento de contingência absoluto caso os arquivos locais não estejam acessíveis
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'mirio-wb.vercel.app';
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  const absoluteTarget = `${proto}://${host}${target}`;

  res.writeHead(307, {
    Location: absoluteTarget,
    'Cache-Control': 'public, max-age=60, s-maxage=3600',
    'Vary': 'Sec-CH-Prefers-Color-Scheme',
    'Access-Control-Allow-Origin': '*'
  });
  res.end();
}
