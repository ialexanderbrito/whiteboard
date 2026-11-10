import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canElementRotate,
  getElementWorldBounds,
  normalizeRotationDeg,
} from '../src/utils/elementBounds.ts';

test('normalizeRotationDeg: normalizes angles into (-180, 180] and avoids -0', () => {
  assert.equal(normalizeRotationDeg(0), 0);
  assert.equal(normalizeRotationDeg(-0), 0);
  assert.equal(normalizeRotationDeg(360), 0);
  assert.equal(normalizeRotationDeg(-360), 0);
  assert.equal(normalizeRotationDeg(180), 180);
  assert.equal(normalizeRotationDeg(-180), 180);
  assert.equal(normalizeRotationDeg(270), -90);
  assert.equal(normalizeRotationDeg(-90), -90);
  assert.equal(normalizeRotationDeg(450), 90);
  assert.equal(normalizeRotationDeg(14.6), 15);
});

test('canElementRotate: allows unlocked board items and blocks frames or locked items', () => {
  assert.equal(canElementRotate({ type: 'sticky', locked: false }), true);
  assert.equal(canElementRotate({ type: 'text' }), true);
  assert.equal(canElementRotate({ type: 'rectangle' }), true);
  assert.equal(canElementRotate({ type: 'sticker' }), true);
  assert.equal(canElementRotate({ type: 'gif' }), true);
  assert.equal(canElementRotate({ type: 'frame' }), false);
  assert.equal(canElementRotate({ type: 'sticky', locked: true }), false);
});

test('getElementWorldBounds: preserves visual center for Konva top-left rotated rectangle', () => {
  // Retângulo 200x100 centrado em (200, 150). Ao girar +90° em torno do centro no Konva,
  // o canto local (0,0) vai para (250, 50).
  const rect90 = {
    id: 'r1',
    type: 'rectangle',
    x: 250,
    y: 50,
    width: 200,
    height: 100,
    rotation: 90,
    zIndex: 1,
    updatedAt: 0,
    updatedBy: 'u1',
  };

  const bounds = getElementWorldBounds(rect90);
  assert.ok(Math.abs(bounds.x - 150) < 1e-6);
  assert.ok(Math.abs(bounds.y - 50) < 1e-6);
  assert.ok(Math.abs(bounds.w - 100) < 1e-6);
  assert.ok(Math.abs(bounds.h - 200) < 1e-6);
});

test('getElementWorldBounds: expands AABB for 45° rotated sticky while keeping center fixed', () => {
  // Post-it 180x180 centrado em (190, 190). Rotacionado +45° em torno de (190, 190):
  const rad = (45 * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = 190;
  const cy = 190;
  // Posição no mundo do canto local (0,0) = (-90, -90) relativo ao centro:
  const rotatedX = cx + -90 * cos - -90 * sin;
  const rotatedY = cy + -90 * sin + -90 * cos;

  const sticky45 = {
    id: 's1',
    type: 'sticky',
    x: rotatedX,
    y: rotatedY,
    width: 180,
    height: 180,
    rotation: 45,
    zIndex: 1,
    updatedAt: 0,
    updatedBy: 'u1',
  };

  const bounds = getElementWorldBounds(sticky45);
  const expectedSide = 180 * Math.SQRT2;
  assert.ok(Math.abs(bounds.x + bounds.w / 2 - cx) < 1e-6);
  assert.ok(Math.abs(bounds.y + bounds.h / 2 - cy) < 1e-6);
  assert.ok(Math.abs(bounds.w - expectedSide) < 1e-6);
  assert.ok(Math.abs(bounds.h - expectedSide) < 1e-6);
});
