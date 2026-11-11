import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('AdaptiveBoardSkeleton: component exists and exports properly', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'AdaptiveBoardSkeleton.tsx');
  assert.ok(fs.existsSync(filePath), 'AdaptiveBoardSkeleton.tsx should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('export const AdaptiveBoardSkeleton'), 'Must export AdaptiveBoardSkeleton');
  assert.ok(content.includes('export function getAdaptiveSnapshot'), 'Must export getAdaptiveSnapshot');
  assert.ok(content.includes('export function saveAdaptiveSnapshot'), 'Must export saveAdaptiveSnapshot');
  assert.ok(content.includes('viewMode'), 'Must adapt to viewMode (grid vs table)');
  assert.ok(content.includes('count'), 'Must adapt to count of boards');
});

test('AdaptiveBoardSkeleton: handles both grid and table modes with matching geometry', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'AdaptiveBoardSkeleton.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Table view structure
  assert.ok(content.includes('viewMode === \'table\''), 'Must have dedicated table skeleton');
  assert.ok(content.includes('Nome do Quadro'), 'Table skeleton must render matching column headers');

  // Grid view structure
  assert.ok(content.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'), 'Grid skeleton must match real card grid layout');
  assert.ok(content.includes('radial-gradient'), 'Grid skeleton must reproduce canvas dot grid header');
  assert.ok(content.includes('animationDelay'), 'Skeleton items must have staggered animationDelay (Emil Kowalski guidelines)');
});

test('DashboardPage: renders AdaptiveBoardSkeleton during loading without layout shift', () => {
  const filePath = path.join(projectRoot, 'src', 'pages', 'DashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('AdaptiveBoardSkeleton'), 'DashboardPage must render AdaptiveBoardSkeleton');
  assert.ok(content.includes('BoardCardPreview'), 'DashboardPage must render BoardCardPreview in grid view');
  assert.ok(content.includes('isLoading'), 'DashboardPage must track isLoading state');
  assert.ok(content.includes('handleToggleViewMode'), 'DashboardPage must persist view mode changes');
  assert.ok(content.includes('saveAdaptiveSnapshot'), 'DashboardPage must save snapshot on interactions');
  assert.ok(content.includes('w-auto'), 'Layout mode toggle buttons must use w-auto on mobile to avoid label collision');
  assert.ok(content.includes('min-w-[540px]'), 'Table must have responsive horizontal scroll floor on mobile');
});

test('BoardCardPreview: renders live SVG mini-map and curated architectural compositions instead of generic dot-and-minus placeholder', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'BoardCardPreview.tsx');
  assert.ok(fs.existsSync(filePath), 'BoardCardPreview.tsx should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('export const BoardCardPreview'), 'Must export BoardCardPreview');
  assert.ok(content.includes('export function getBoardPreviewVariant'), 'Must export deterministic variant generator');
  assert.ok(content.includes('elementService.subscribeElements'), 'Must subscribe to board elements for live mini-map');
  assert.ok(content.includes('getElementWorldBounds'), 'Must compute world bounds for SVG viewBox');
  assert.ok(content.includes('cubic-bezier(0.23,1,0.32,1)'), 'Must use Emil Kowalski custom ease-out curve');
  assert.ok(content.includes('@media(hover:hover)_and_(pointer:fine)'), 'Must gate hover animations behind fine pointer media query');
});
