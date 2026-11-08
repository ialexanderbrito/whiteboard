import test from 'node:test';
import assert from 'node:assert/strict';
import { getElementBounds, alignElements } from '../src/utils/alignment.ts';

test('getElementBounds calculates correct bounds for sticky note and shapes', () => {
  const sticky = {
    id: 's1',
    type: 'sticky',
    x: 100,
    y: 150,
    width: 200,
    height: 180,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const bounds = getElementBounds(sticky);
  assert.equal(bounds.left, 100);
  assert.equal(bounds.top, 150);
  assert.equal(bounds.width, 200);
  assert.equal(bounds.height, 180);
  assert.equal(bounds.right, 300);
  assert.equal(bounds.bottom, 330);
  assert.equal(bounds.centerX, 200);
  assert.equal(bounds.centerY, 240);
});

test('getElementBounds calculates correct bounds for circle (centered coordinate)', () => {
  const circle = {
    id: 'c1',
    type: 'circle',
    x: 200,
    y: 300,
    radius: 40,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const bounds = getElementBounds(circle);
  assert.equal(bounds.left, 160);
  assert.equal(bounds.top, 260);
  assert.equal(bounds.width, 80);
  assert.equal(bounds.height, 80);
  assert.equal(bounds.right, 240);
  assert.equal(bounds.bottom, 340);
  assert.equal(bounds.centerX, 200);
  assert.equal(bounds.centerY, 300);
});

test('getElementBounds calculates correct bounds for pen stroke', () => {
  const pen = {
    id: 'p1',
    type: 'pen',
    x: 50,
    y: 50,
    points: [10, 20, 110, 80, 60, 120],
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const bounds = getElementBounds(pen);
  assert.equal(bounds.left, 60);
  assert.equal(bounds.top, 70);
  assert.equal(bounds.width, 100);
  assert.equal(bounds.height, 100);
  assert.equal(bounds.right, 160);
  assert.equal(bounds.bottom, 170);
});

test('alignElements: left alignment', () => {
  const e1 = { id: '1', type: 'sticky', x: 100, y: 100, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e2 = { id: '2', type: 'sticky', x: 250, y: 200, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e3 = { id: '3', type: 'circle', x: 400, y: 300, radius: 50, zIndex: 1, updatedBy: 'u1', updatedAt: 1 }; // left = 350

  const updates = alignElements([e1, e2, e3], 'left');
  const map = new Map(updates.map(u => [u.id, u.updates]));

  // e1 is already at left: 100
  assert.equal(map.has('1'), false);
  // e2 left was 250, should move to 100
  assert.equal(map.get('2')?.x, 100);
  // e3 circle center was 400 (left 350), target left is 100, so new center = 100 + 50 = 150
  assert.equal(map.get('3')?.x, 150);
});

test('alignElements: center-horizontal alignment', () => {
  const e1 = { id: '1', type: 'sticky', x: 100, y: 100, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 }; // left 100, right 200
  const e2 = { id: '2', type: 'sticky', x: 500, y: 200, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 }; // left 500, right 600

  // minLeft = 100, maxRight = 600 -> groupCenterX = 350
  const updates = alignElements([e1, e2], 'center-horizontal');
  const map = new Map(updates.map(u => [u.id, u.updates]));

  // e1 width 100 -> new x = 350 - 50 = 300
  assert.equal(map.get('1')?.x, 300);
  // e2 width 100 -> new x = 350 - 50 = 300
  assert.equal(map.get('2')?.x, 300);
});

test('alignElements: right alignment', () => {
  const e1 = { id: '1', type: 'sticky', x: 100, y: 100, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e2 = { id: '2', type: 'circle', x: 450, y: 200, radius: 50, zIndex: 1, updatedBy: 'u1', updatedAt: 1 }; // right = 500

  const updates = alignElements([e1, e2], 'right');
  const map = new Map(updates.map(u => [u.id, u.updates]));

  // e1 right should become 500 -> new x = 500 - 100 = 400
  assert.equal(map.get('1')?.x, 400);
  // e2 is already right = 500
  assert.equal(map.has('2'), false);
});

test('alignElements: top, center-vertical, bottom alignments', () => {
  const e1 = { id: '1', type: 'sticky', x: 100, y: 50, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e2 = { id: '2', type: 'sticky', x: 200, y: 350, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };

  // top: minTop = 50
  const topUpdates = alignElements([e1, e2], 'top');
  assert.equal(topUpdates.find(u => u.id === '2')?.updates.y, 50);

  // bottom: maxBottom = 450
  const bottomUpdates = alignElements([e1, e2], 'bottom');
  assert.equal(bottomUpdates.find(u => u.id === '1')?.updates.y, 350);

  // center-vertical: (50 + 450) / 2 = 250 -> new y = 250 - 50 = 200
  const centerUpdates = alignElements([e1, e2], 'center-vertical');
  assert.equal(centerUpdates.find(u => u.id === '1')?.updates.y, 200);
  assert.equal(centerUpdates.find(u => u.id === '2')?.updates.y, 200);
});

test('alignElements: distribute-horizontal spaces items evenly', () => {
  const e1 = { id: '1', type: 'sticky', x: 100, y: 100, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e2 = { id: '2', type: 'sticky', x: 250, y: 100, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e3 = { id: '3', type: 'sticky', x: 500, y: 100, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };

  // Total bounds: 100 to 600 (width 500). Elements width = 300. Available space = 200. Gap = 100.
  // e1: 100..200
  // e2: 300..400 (was 250, moves to 300)
  // e3: 500..600 (stays at 500)
  const updates = alignElements([e1, e2, e3], 'distribute-horizontal');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, '2');
  assert.equal(updates[0].updates.x, 300);
});

test('alignElements: respects locked elements and does not move them', () => {
  const e1 = { id: '1', type: 'sticky', x: 100, y: 100, width: 100, height: 100, locked: true, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };
  const e2 = { id: '2', type: 'sticky', x: 300, y: 200, width: 100, height: 100, zIndex: 1, updatedBy: 'u1', updatedAt: 1 };

  const updates = alignElements([e1, e2], 'left');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, '2');
  assert.equal(updates[0].updates.x, 100);
});
