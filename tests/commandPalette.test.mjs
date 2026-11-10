import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('BuyMeACoffeeModal supports controlled open and onOpenChange props', () => {
  const src = readSource('src/components/layout/BuyMeACoffeeModal.tsx');
  assert.match(src, /open\?:\s*boolean/);
  assert.match(src, /onOpenChange\?:\s*\(open:\s*boolean\)\s*=>\s*void/);
  assert.match(src, /hideTrigger\?:\s*boolean/);
  assert.match(src, /<Dialog\s+open=\{open\}\s+onOpenChange=\{setOpen\}>/);
});

test('CommandDialog removes closing exit animation to prevent Radix FocusScope overlap with target modals', () => {
  const src = readSource('src/components/ui/command.tsx');
  assert.doesNotMatch(src, /data-\[state=closed\]:animate-out/);
  assert.match(src, /DialogPrimitive\.Title/);
  assert.match(src, /DialogPrimitive\.Description/);
});

test('CommandPalette wires handleOpenCoffeeModal and defers modal callbacks after closing CommandDialog', () => {
  const src = readSource('src/components/command/CommandPalette.tsx');
  assert.match(src, /const handleOpenCoffeeModal = \(\) =>/);
  assert.match(src, /onSelect=\{\(\) => handleSelect\(handleOpenCoffeeModal\)\}/);
  assert.match(src, /<BuyMeACoffeeModal[\s\S]*?open=\{isInternalCoffeeOpen\}[\s\S]*?hideTrigger/);
  assert.match(src, /setTimeout\(\(\) => \{\s*callback\(\);\s*\}, 15\)/);
});

test('DashboardPage and BoardPage wire onOpenCoffee and Share modal to CommandPalette', () => {
  const dashboardSrc = readSource('src/pages/DashboardPage.tsx');
  const boardSrc = readSource('src/pages/BoardPage.tsx');
  assert.match(dashboardSrc, /onOpenCoffee:\s*\(\)\s*=>\s*setIsCoffeeModalOpen\(true\)/);
  assert.match(boardSrc, /onOpenCoffee:\s*\(\)\s*=>\s*setIsCoffeeModalOpen\(true\)/);
  assert.match(boardSrc, /onShare:\s*\(\)\s*=>\s*setIsShareModalOpen\(true\)/);
  assert.match(boardSrc, /onCopyLink:\s*handleCopyShareLink/);
});
