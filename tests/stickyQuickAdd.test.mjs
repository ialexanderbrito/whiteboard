import test from 'node:test';
import assert from 'node:assert/strict';
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
