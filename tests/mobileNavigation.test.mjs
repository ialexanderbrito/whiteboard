import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  blendTouchVelocity,
  stepInertialPan,
  computePinchViewport,
  computeFitToContentViewport,
} from '../src/utils/viewport.ts';
import { isBoundsInViewport } from '../src/utils/elementBounds.ts';

test('blendTouchVelocity blends instantaneous finger velocity with EMA and clamps extremes', () => {
  const v0 = { vx: 0, vy: 0 };
  const v1 = blendTouchVelocity(v0, 32, -16, 16);
  // Initial sample takes full instantaneous velocity (vx = 2 px/ms, vy = -1 px/ms)
  assert.ok(Math.abs(v1.vx - 2) < 1e-6);
  assert.ok(Math.abs(v1.vy - -1) < 1e-6);

  // Subsequent sample blends with 0.35 * prev + 0.65 * instant
  const v2 = blendTouchVelocity(v1, 16, -8, 16);
  assert.ok(Math.abs(v2.vx - (2 * 0.35 + 1 * 0.65)) < 1e-6);

  // Extreme spike is clamped to maxSpeed (3.5 px/ms by default)
  const vSpike = blendTouchVelocity(v0, 500, 500, 4);
  const speed = Math.hypot(vSpike.vx, vSpike.vy);
  assert.ok(speed <= 3.5 + 1e-6);
});

test('stepInertialPan advances camera with momentum and stops below threshold', () => {
  let pos = { x: 100, y: 200 };
  let velocity = { vx: 1.8, vy: -0.9 };
  let steps = 0;
  let active = true;

  while (active && steps < 300) {
    const res = stepInertialPan(pos, velocity, 16);
    pos = { x: res.x, y: res.y };
    velocity = { vx: res.vx, vy: res.vy };
    active = res.active;
    steps++;
  }

  assert.equal(active, false, 'inertia should decay to rest');
  assert.ok(steps > 10 && steps < 180, `expected natural momentum duration, got ${steps} frames`);
  assert.ok(pos.x > 250, 'camera should have glided right');
  assert.ok(pos.y < 120, 'camera should have glided up');
});

test('computePinchViewport keeps world anchor point under pinch center and clamps scale', () => {
  const centerWorld = { x: 250, y: 150 };
  const startDist = 100;
  const startScale = 1;
  const currentCenter = { x: 400, y: 300 };
  const currentDist = 200; // 2x zoom

  const next = computePinchViewport(
    centerWorld,
    startDist,
    startScale,
    currentCenter,
    currentDist,
    0.1,
    5
  );

  assert.equal(next.scale, 2);
  // world point under currentCenter at new scale must still equal centerWorld
  const worldUnderCenterX = (currentCenter.x - next.x) / next.scale;
  const worldUnderCenterY = (currentCenter.y - next.y) / next.scale;
  assert.ok(Math.abs(worldUnderCenterX - centerWorld.x) < 1e-6);
  assert.ok(Math.abs(worldUnderCenterY - centerWorld.y) < 1e-6);
});

test('computeFitToContentViewport fits and centers board bounds inside mobile viewport', () => {
  const bounds = [
    { x: 0, y: 0, w: 400, h: 300 },
    { x: 600, y: 200, w: 400, h: 500 },
  ]; // total: 1000 x 700
  const fitted = computeFitToContentViewport(bounds, 390, 844, {
    topInset: 64,
    padding: 24,
    minScale: 0.15,
    maxScale: 1.15,
  });

  assert.ok(fitted !== null);
  // Available width = 390 - 48 = 342 -> scaleX = 0.342
  assert.ok(Math.abs(fitted.scale - 0.342) < 0.01);
  // Content center X (500) mapped to screen X should be at viewport center (195)
  const screenCenterX = 500 * fitted.scale + fitted.x;
  assert.ok(Math.abs(screenCenterX - 195) <= 1);
});

test('isBoundsInViewport accurately culls off-screen elements while keeping visible ones', () => {
  const viewport = { x: -500, y: -300, scale: 1 };
  const visibleBox = { x: 600, y: 400, w: 180, h: 180 };
  const farOffscreenBox = { x: 3200, y: 2800, w: 180, h: 180 };

  assert.equal(isBoundsInViewport(visibleBox, viewport, 390, 844, 240), true);
  assert.equal(isBoundsInViewport(farOffscreenBox, viewport, 390, 844, 240), false);
});

test('Mobile and readOnly performance optimizations are wired into CanvasGrid, WhiteboardCanvas, and BoardPage', () => {
  const canvasCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'),
    'utf8'
  );
  const gridCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/CanvasGrid.tsx'),
    'utf8'
  );
  const boardPageCode = fs.readFileSync(
    path.resolve('src/pages/BoardPage.tsx'),
    'utf8'
  );

  // 1. Konva Hit-Canvas disabled in readOnly mode & 1-finger pan works anywhere on screen
  assert.ok(
    canvasCode.includes('listening={!readOnly}'),
    'elements-layer should disable Konva hit-testing in readOnly mode'
  );
  assert.ok(
    canvasCode.includes("(readOnly || currentTool === 'pan') && !isSpacePressed && touches.length === 1"),
    '1-finger touch pan should activate anywhere in readOnly mode, not only on empty stage'
  );

  // 2. Inertial momentum & rAF coalescing in WhiteboardCanvas
  assert.ok(
    canvasCode.includes('stepInertialPan(') && canvasCode.includes('scheduleStagePan('),
    'WhiteboardCanvas should coalesce touchmove in rAF and run inertial momentum on release'
  );

  // 3. CanvasGrid uses GPU translate3d instead of per-frame backgroundPosition repaints
  assert.ok(
    gridCode.includes('translate3d(') && !gridCode.includes('style.backgroundPosition'),
    'CanvasGrid should translate pattern layer via GPU transform instead of backgroundPosition'
  );

  // 4. BoardPage skips RemoteCursors on mobile and provides Fit-to-Content
  assert.ok(
    boardPageCode.includes('showRemoteCursors && !isMobile'),
    'BoardPage should not mount RemoteCursors on mobile viewports'
  );
  assert.ok(
    boardPageCode.includes('handleFitToContent'),
    'BoardPage should provide Fit-to-Content on mobile'
  );
});

test('MobileBoardNavbar and MobileReadOnlyDrawer implement floating HUD, gesture guide, and desktop handoff', () => {
  const navbarCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/MobileBoardNavbar.tsx'),
    'utf8'
  );
  const drawerCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/MobileReadOnlyDrawer.tsx'),
    'utf8'
  );

  // Floating HUD with safe-area-inset-top, back button on left, fit-to-content, and share/copy handoff
  assert.ok(
    navbarCode.includes('env(safe-area-inset-top)') &&
      navbarCode.includes('onOpenMobileGuide') &&
      navbarCode.includes('onFitToContent'),
    'MobileBoardNavbar should respect safe-area-inset-top and expose guide + fit-to-content triggers'
  );

  // Drawer includes 3-column gesture strip, cross-device handoff, and Emil Kowalski tactile/blur transitions
  assert.ok(
    drawerCode.includes('grid-cols-3') &&
      drawerCode.includes('Enviar p/ PC') &&
      drawerCode.includes('blur(2px)'),
    'MobileReadOnlyDrawer should display 3-column gesture strip, PC handoff CTA, and blur-masked state crossfade'
  );
});
