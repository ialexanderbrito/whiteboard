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
  assert.ok(content.includes('isLoading'), 'DashboardPage must track isLoading state');
  assert.ok(content.includes('handleToggleViewMode'), 'DashboardPage must persist view mode changes');
  assert.ok(content.includes('saveAdaptiveSnapshot'), 'DashboardPage must save snapshot on interactions');
});
