import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Custom Scrollbar System: adheres to Mirio Linear/Vercel aesthetic and cross-browser standards', () => {
  const css = readSource('src/index.css');

  // 1. W3C Standard CSS Scrollbars (Firefox, Chrome 121+, Edge 121+, Safari 17.2+)
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-color:\s*hsl\(var\(--muted-foreground\)\s*\/\s*0\.28\)\s*transparent/);
  assert.match(css, /\.dark[\s\S]*?scrollbar-color:\s*hsl\(var\(--muted-foreground\)\s*\/\s*0\.35\)\s*transparent/);

  // 2. WebKit / Chromium pseudo-elements with floating pill craft technique
  assert.match(css, /::-webkit-scrollbar/);
  assert.match(css, /\*::-webkit-scrollbar/);
  assert.match(css, /background-clip:\s*padding-box/);
  assert.match(css, /border-radius:\s*9999px/);
  assert.match(css, /::-webkit-scrollbar-thumb:hover/);
  assert.match(css, /::-webkit-scrollbar-thumb:active/);
  assert.match(css, /::-webkit-scrollbar-corner/);

  // 3. Smooth scrolling with reduced-motion accessibility support
  assert.match(css, /scroll-behavior:\s*smooth/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);

  // 4. Utility classes for hiding and tailoring scrollbars
  assert.match(css, /\.no-scrollbar/);
  assert.match(css, /scrollbar-width:\s*none\s*!important/);
  assert.match(css, /\.custom-scrollbar/);
  assert.match(css, /\.custom-scrollbar-thin/);

  // 5. Canvas overscroll protection
  assert.match(css, /overscroll-behavior:\s*none/);
});

test('Core UI components wire custom-scrollbar utilities appropriately', () => {
  const tableSrc = readSource('src/components/ui/table.tsx');
  const commandSrc = readSource('src/components/ui/command.tsx');
  const modalSrc = readSource('src/components/ui/responsive-modal.tsx');
  const selectSrc = readSource('src/components/ui/select.tsx');
  const layersSrc = readSource('src/components/whiteboard/LayersPanel.tsx');

  assert.match(tableSrc, /custom-scrollbar/);
  assert.match(commandSrc, /custom-scrollbar/);
  assert.match(modalSrc, /custom-scrollbar/);
  assert.match(selectSrc, /custom-scrollbar/);
  assert.match(layersSrc, /custom-scrollbar-thin/);
});
