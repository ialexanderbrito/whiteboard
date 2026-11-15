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
  // Modal responsivo: Dialog do Radix no desktop e bottom sheet (vaul) no mobile
  assert.match(src, /<ResponsiveModalRoot\s+open=\{open\}\s+onOpenChange=\{setOpen\}>/);
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

test('CommandPalette wires smartGuides toggle option under Exibição e Grade', () => {
  const src = readSource('src/components/command/CommandPalette.tsx');
  assert.match(src, /boardContext\.onToggleSmartGuides/);
  assert.match(src, /Guias Inteligentes e Encaixe Magnético/);
  assert.match(src, /value="guias inteligentes encaixe magnetico/);
});

test('BoardPage wires smartGuides and onToggleSmartGuides to CommandPalette', () => {
  const boardSrc = readSource('src/pages/BoardPage.tsx');
  assert.match(boardSrc, /smartGuides:\s*smartGuidesEnabled/);
  assert.match(boardSrc, /onToggleSmartGuides:\s*handleToggleSmartGuides/);
});

test('CommandPalette organizes tools into distinct navigation and creation groups', () => {
  const src = readSource('src/components/command/CommandPalette.tsx');
  assert.match(src, /heading="Navegação & Modos"/);
  assert.match(src, /heading="Criação & Desenho"/);
  assert.doesNotMatch(src, /heading="Ferramentas do Canvas"/);
});

test('CommandPalette adheres strictly to black-and-white monochrome design standard', () => {
  const src = readSource('src/components/command/CommandPalette.tsx');
  // No rainbow Tailwind palette colors in icon badges or text
  assert.doesNotMatch(src, /(amber|blue|indigo|cyan|emerald|violet|rose|teal|purple|pink)-\d+/);
  // Header indicator is subtle neutral ring instead of emerald pulse
  assert.doesNotMatch(src, /bg-emerald-500/);
  assert.match(src, /bg-foreground\/40\s+ring-2\s+ring-border\/50/);
  // Neutral icon badges inverted on selection
  assert.match(src, /const itemIconClass =/);
  assert.match(src, /group-data-\[selected=true\]:bg-foreground/);
});
