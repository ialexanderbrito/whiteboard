import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAdjacentStickyRect,
  STICKY_QUICK_ADD_GAP,
} from '../src/utils/stickyPlacement.ts';

const origin = { x: 100, y: 200, width: 180, height: 180 };

test('getAdjacentStickyRect: right places the card after the origin', () => {
  assert.deepEqual(getAdjacentStickyRect(origin, 'right'), {
    x: 100 + 180 + STICKY_QUICK_ADD_GAP,
    y: 200,
    width: 180,
    height: 180,
  });
});

test('getAdjacentStickyRect: left places the card before the origin', () => {
  assert.deepEqual(getAdjacentStickyRect(origin, 'left'), {
    x: 100 - 180 - STICKY_QUICK_ADD_GAP,
    y: 200,
    width: 180,
    height: 180,
  });
});

test('getAdjacentStickyRect: top places the card above the origin', () => {
  assert.deepEqual(getAdjacentStickyRect(origin, 'top'), {
    x: 100,
    y: 200 - 180 - STICKY_QUICK_ADD_GAP,
    width: 180,
    height: 180,
  });
});

test('getAdjacentStickyRect: bottom places the card below the origin', () => {
  assert.deepEqual(getAdjacentStickyRect(origin, 'bottom'), {
    x: 100,
    y: 200 + 180 + STICKY_QUICK_ADD_GAP,
    width: 180,
    height: 180,
  });
});

test('getAdjacentStickyRect: accepts a custom gap and preserves custom sizes', () => {
  const custom = { x: -50, y: 40, width: 260, height: 120 };
  assert.deepEqual(getAdjacentStickyRect(custom, 'right', 10), {
    x: -50 + 260 + 10,
    y: 40,
    width: 260,
    height: 120,
  });
});

test('StickyQuickAdd and WhiteboardCanvas support "+" quick-add on both sticky notes and geometric shapes', () => {
  const canvasSource = fs.readFileSync(
    path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'),
    'utf8'
  );
  const quickAddSource = fs.readFileSync(
    path.resolve('src/components/whiteboard/StickyQuickAdd.tsx'),
    'utf8'
  );

  assert.ok(
    canvasSource.includes("['sticky', 'rect', 'circle', 'diamond', 'triangle', 'star'].includes(selectedElements[0].type)"),
    'WhiteboardCanvas should enable quick-add for sticky notes and all geometric shapes'
  );
  assert.ok(
    canvasSource.includes('<StickyQuickAdd sticky={selectedQuickAddElement} onCreate={handleQuickAddSticky} />'),
    'WhiteboardCanvas should pass selectedQuickAddElement to StickyQuickAdd'
  );
  assert.ok(
    quickAddSource.includes("const itemLabel = sticky.type === 'sticky' ? 'post-it' : 'forma'"),
    'StickyQuickAdd should use appropriate accessible label for shapes vs sticky notes'
  );
});
