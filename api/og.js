export default function handler(req, res) {
  const queryTheme = req.query?.theme;
  const clientHintTheme = req.headers?.['sec-ch-prefers-color-scheme'];

  const isLight = queryTheme === 'light' || (!queryTheme && clientHintTheme === 'light');
  const target = isLight ? '/og-light.png' : '/og-dark.png';

  res.writeHead(307, {
    Location: target,
    'Cache-Control': 'public, max-age=60, s-maxage=3600',
    'Vary': 'Sec-CH-Prefers-Color-Scheme'
  });
  res.end();
}
