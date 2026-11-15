import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cleanGifUrl } from '../src/utils/gif.ts';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');

test('cleanGifUrl normalizes links without requiring hardcoded legacy dictionary tables', () => {
  assert.equal(cleanGifUrl(''), '');
  assert.equal(cleanGifUrl(undefined), '');

  // Direct CDN links (Klipy, Imgur, custom CDNs) are returned verbatim
  const klipyUrl = 'https://static.klipy.com/ii/some-hash/46/6a/sample.gif';
  assert.equal(cleanGifUrl(klipyUrl), klipyUrl);

  // Giphy media URLs normalize dynamically to canonical i.giphy.com URL
  const giphyUrl = 'https://media.giphy.com/media/xyz123abc/giphy.gif';
  assert.equal(cleanGifUrl(giphyUrl), 'https://i.giphy.com/media/xyz123abc/giphy.gif');

  const giphyV1 = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI.../xyz123abc/giphy.gif';
  assert.equal(cleanGifUrl(giphyV1), 'https://i.giphy.com/media/xyz123abc/giphy.gif');
});

test('gif.ts and StickersModal.tsx do not contain hardcoded legacy gif arrays or dictionaries', () => {
  const gifSource = readSource('src/utils/gif.ts');
  assert.equal(
    gifSource.includes('LEGACY_GIPHY_FALLBACKS'),
    false,
    'LEGACY_GIPHY_FALLBACKS must not exist in src/utils/gif.ts'
  );
  assert.equal(
    gifSource.includes('GkVM3PcFipxEk'),
    false,
    'Legacy GIF ID GkVM3PcFipxEk must not be hardcoded in src/utils/gif.ts'
  );

  const modalSource = readSource('src/components/whiteboard/StickersModal.tsx');
  assert.equal(
    modalSource.includes('CURATED_GIFS'),
    false,
    'CURATED_GIFS array must not exist in StickersModal.tsx'
  );
  assert.equal(
    modalSource.includes('Brinde DiCaprio'),
    false,
    'Hardcoded DiCaprio legacy gif must not exist in StickersModal.tsx'
  );
  assert.match(
    modalSource,
    /isLoadingTrending/,
    'Trending GIFs must load dynamically with isLoadingTrending state'
  );
});
