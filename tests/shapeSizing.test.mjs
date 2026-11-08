import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShapeDragBounds, getDefaultShapeBounds } from '../src/utils/shapeSizing.ts';

test('calculateShapeDragBounds: rect dragged down-right', () => {
  const start = { x: 100, y: 100 };
  const current = { x: 300, y: 250 };
  const bounds = calculateShapeDragBounds('rect', start, current, false);

  assert.equal(bounds.x, 100);
  assert.equal(bounds.y, 100);
  assert.equal(bounds.width, 200);
  assert.equal(bounds.height, 150);
});

test('calculateShapeDragBounds: rect dragged up-left (inversed drag)', () => {
  const start = { x: 300, y: 250 };
  const current = { x: 100, y: 100 };
  const bounds = calculateShapeDragBounds('rect', start, current, false);

  assert.equal(bounds.x, 100);
  assert.equal(bounds.y, 100);
  assert.equal(bounds.width, 200);
  assert.equal(bounds.height, 150);
});

test('calculateShapeDragBounds: rect with Shift key maintains 1:1 square ratio', () => {
  const start = { x: 50, y: 50 };
  const current = { x: 250, y: 150 }; // dx=200, dy=100
  const bounds = calculateShapeDragBounds('rect', start, current, true);

  assert.equal(bounds.width, 200);
  assert.equal(bounds.height, 200);
  assert.equal(bounds.x, 50);
  assert.equal(bounds.y, 50);
});

test('calculateShapeDragBounds: circle center (cx, cy) and radius calculation', () => {
  const start = { x: 100, y: 100 };
  const current = { x: 300, y: 300 }; // dx=200, dy=200
  const bounds = calculateShapeDragBounds('circle', start, current, false);

  assert.equal(bounds.radius, 100);
  assert.equal(bounds.width, 200);
  assert.equal(bounds.height, 200);
  assert.equal(bounds.x, 200); // 100 + 100
  assert.equal(bounds.y, 200);
});

test('calculateShapeDragBounds: circle dragged up-left keeps proper center', () => {
  const start = { x: 300, y: 300 };
  const current = { x: 100, y: 100 };
  const bounds = calculateShapeDragBounds('circle', start, current, false);

  assert.equal(bounds.radius, 100);
  assert.equal(bounds.width, 200);
  assert.equal(bounds.height, 200);
  assert.equal(bounds.x, 200);
  assert.equal(bounds.y, 200);
});

test('calculateShapeDragBounds: clamps minimum dimensions to prevent inverted or invisible elements', () => {
  const start = { x: 100, y: 100 };
  const current = { x: 101, y: 101 };
  const bounds = calculateShapeDragBounds('rect', start, current, false);

  assert.ok(bounds.width >= 4);
  assert.ok(bounds.height >= 4);
});

test('getDefaultShapeBounds: returns correct default dimensions centered on click', () => {
  const click = { x: 500, y: 400 };

  const rect = getDefaultShapeBounds('rect', click);
  assert.equal(rect.width, 160);
  assert.equal(rect.height, 100);
  assert.equal(rect.x, 500 - 80);
  assert.equal(rect.y, 400 - 50);

  const circle = getDefaultShapeBounds('circle', click);
  assert.equal(circle.radius, 60);
  assert.equal(circle.width, 120);
  assert.equal(circle.height, 120);
  assert.equal(circle.x, 500);
  assert.equal(circle.y, 400);

  const diamond = getDefaultShapeBounds('diamond', click);
  assert.equal(diamond.width, 140);
  assert.equal(diamond.height, 140);
  assert.equal(diamond.x, 500 - 70);
  assert.equal(diamond.y, 400 - 70);

  const triangle = getDefaultShapeBounds('triangle', click);
  assert.equal(triangle.width, 140);
  assert.equal(triangle.height, 130);
  assert.equal(triangle.x, 500 - 70);
  assert.equal(triangle.y, 400 - 65);

  const star = getDefaultShapeBounds('star', click);
  assert.equal(star.width, 130);
  assert.equal(star.height, 130);
  assert.equal(star.x, 500 - 65);
  assert.equal(star.y, 400 - 65);
});
