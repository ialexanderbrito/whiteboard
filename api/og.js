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

  // Redirecionamento de contingência seguro relativo (imune a Host Header Injection / Open Redirect)
  res.writeHead(307, {
    Location: target,
    'Cache-Control': 'public, max-age=60, s-maxage=3600',
    'Vary': 'Sec-CH-Prefers-Color-Scheme',
    'Access-Control-Allow-Origin': '*'
  });
  res.end();
}
