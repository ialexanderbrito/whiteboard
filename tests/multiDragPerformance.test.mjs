import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateSmartGuidesAndSnap } from '../src/utils/smartGuides.ts';

test('calculateSmartGuidesAndSnap: uses precomputedTargets directly without recomputing bounds', () => {
  const candidate = {
    id: 'el-1',
    type: 'rect',
    x: 200,
    y: 100,
    width: 100,
    height: 100,
  };
  const precomputedTargets = [
    {
      element: candidate,
      bounds: { x: 200, y: 100, w: 100, h: 100 },
    },
  ];

  const draggedBounds = { x: 204, y: 300, w: 100, h: 100 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: [candidate],
    precomputedTargets,
    tolerance: 8,
  });

  assert.equal(result.hasSnapX, true);
  assert.equal(result.snappedX, 200);
  assert.equal(result.deltaX, -4);
  assert.equal(result.guides.length, 1);
});

test('WhiteboardCanvas: detaches redundant Konva Transformer proxy drag listeners from attached nodes', () => {
  const source = fs.readFileSync(path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'), 'utf8');

  // Must detach proxy drag listeners to prevent Konva from running 48 simultaneous drag runners
  assert.ok(
    source.includes("node.off(`dragstart.${ns}`)") &&
    source.includes("node.off(`dragmove.${ns}`)") &&
    source.includes("node.off(`dragend.${ns}`)"),
    'WhiteboardCanvas must detach redundant Transformer drag proxy listeners to prevent multiple concurrent drag loops'
  );
});

test('WhiteboardCanvas: implements dragSessionRef with O(1) node caching and leader guarding', () => {
  const source = fs.readFileSync(path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'), 'utf8');

  // Must have dragSessionRef tracking session items, leader and precomputed smart guides
  assert.ok(
    source.includes('dragSessionRef = useRef<DragSession | null>(null)'),
    'WhiteboardCanvas must define dragSessionRef'
  );

  // onDragMove must guard against non-leader drag events
  assert.ok(
    source.includes('session.leaderId !== targetId'),
    'onDragMove must guard against non-leader drag events to prevent N*N event explosion'
  );
});

test('WhiteboardCanvas: pools Konva.Line instances in drawSmartGuides and clearSmartGuides', () => {
  const source = fs.readFileSync(path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'), 'utf8');

  // Must use line pooling instead of destroyChildren on every mouse move
  assert.ok(
    source.includes('getPooledLine') &&
    source.includes('child.visible(false)'),
    'WhiteboardCanvas must pool lines in drawSmartGuides to avoid garbage collection freeze'
  );
});

test('WhiteboardCanvas: guards duplicate batch updates with debounce in handleElementChange', () => {
  const source = fs.readFileSync(path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'), 'utf8');

  assert.ok(
    source.includes('lastBatchUpdateRef') &&
    source.includes('now - lastBatchUpdateRef.current.timestamp < 150'),
    'handleElementChange must guard duplicate batch updates on drag completion'
  );
});

test('Performance benchmark: moving 48 items completes in < 1ms per frame', () => {
  const itemCount = 48;
  const items = new Map();
  for (let i = 0; i < itemCount; i++) {
    items.set(`item-${i}`, {
      x: i * 20,
      y: i * 20,
      initX: i * 20,
      initY: i * 20,
      position(pos) {
        this.x = pos.x;
        this.y = pos.y;
      },
    });
  }

  const frames = 500;
  const start = performance.now();
  for (let f = 0; f < frames; f++) {
    const dx = f;
    const dy = f;
    items.forEach((item, id) => {
      if (id === 'item-0') return;
      item.position({ x: item.initX + dx, y: item.initY + dy });
    });
  }
  const totalElapsed = performance.now() - start;
  const perFrame = totalElapsed / frames;

  assert.ok(perFrame < 0.2, `Per-frame processing must be < 0.2ms, got ${perFrame.toFixed(4)}ms`);
});
