import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSmartGuidesAndSnap } from '../src/utils/smartGuides.ts';

test('calculateSmartGuidesAndSnap: returns original coordinates when no candidates exist', () => {
  const draggedBounds = { x: 100, y: 150, w: 100, h: 100 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: [],
    tolerance: 8,
  });

  assert.equal(result.snappedX, 100);
  assert.equal(result.snappedY, 150);
  assert.equal(result.deltaX, 0);
  assert.equal(result.deltaY, 0);
  assert.equal(result.hasSnapX, false);
  assert.equal(result.hasSnapY, false);
  assert.equal(result.guides.length, 0);
});

test('calculateSmartGuidesAndSnap: snaps left edge to target left edge within tolerance', () => {
  // Candidate at x: 200, y: 100
  const candidate = {
    id: 'el-1',
    type: 'rect',
    x: 200,
    y: 100,
    width: 100,
    height: 100,
  };

  // Dragged at x: 204 (4px diff, <= 8px tolerance)
  const draggedBounds = { x: 204, y: 300, w: 100, h: 100 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: [candidate],
    tolerance: 8,
  });

  assert.equal(result.hasSnapX, true);
  assert.equal(result.snappedX, 200);
  assert.equal(result.deltaX, -4);
  assert.equal(result.hasSnapY, false);
  assert.equal(result.guides.length, 1);
  assert.equal(result.guides[0].orientation, 'vertical');
  assert.equal(result.guides[0].lineCoord, 200);
  // Guide spans from candidate top (100) to dragged bottom (400) + padding
  assert.ok(result.guides[0].start <= 100);
  assert.ok(result.guides[0].end >= 400);
});

test('calculateSmartGuidesAndSnap: does NOT snap when outside tolerance threshold', () => {
  const candidate = {
    id: 'el-1',
    type: 'rect',
    x: 200,
    y: 100,
    width: 100,
    height: 100,
  };

  // Dragged at x: 215 (15px diff > 8px tolerance)
  const draggedBounds = { x: 215, y: 300, w: 100, h: 100 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: [candidate],
    tolerance: 8,
  });

  assert.equal(result.hasSnapX, false);
  assert.equal(result.snappedX, 215);
  assert.equal(result.deltaX, 0);
  assert.equal(result.guides.length, 0);
});

test('calculateSmartGuidesAndSnap: snaps center-to-center on both X and Y simultaneously', () => {
  // Target center: x = 100 + 100/2 = 150, y = 100 + 100/2 = 150
  const candidate = {
    id: 'el-1',
    type: 'rect',
    x: 100,
    y: 100,
    width: 100,
    height: 100,
  };

  // Dragged box width 60, height 60. Center should be at 150, 150 => top-left at 120, 120
  // Positioned at x: 122, y: 118 (both within 5px of center alignment)
  const draggedBounds = { x: 122, y: 118, w: 60, h: 60 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: [candidate],
    tolerance: 6,
  });

  assert.equal(result.hasSnapX, true);
  assert.equal(result.hasSnapY, true);
  assert.equal(result.snappedX, 120); // 120 + 30 = 150 (center matches)
  assert.equal(result.snappedY, 120); // 120 + 30 = 150 (center matches)
  assert.equal(result.deltaX, -2);
  assert.equal(result.deltaY, 2);
  assert.equal(result.guides.length, 2);
});

test('calculateSmartGuidesAndSnap: spans horizontal line across multiple aligned objects', () => {
  // Candidate 1 at x: 50, y: 100, w: 100, h: 100 (top = 100)
  // Candidate 2 at x: 300, y: 100, w: 100, h: 100 (top = 100)
  const candidates = [
    { id: 'el-1', type: 'rect', x: 50, y: 100, width: 100, height: 100 },
    { id: 'el-2', type: 'rect', x: 300, y: 100, width: 100, height: 100 },
  ];

  // Dragged at x: 180, y: 103 (diff of 3px from top = 100)
  const draggedBounds = { x: 180, y: 103, w: 80, h: 80 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: candidates,
    tolerance: 5,
  });

  assert.equal(result.hasSnapY, true);
  assert.equal(result.snappedY, 100);
  assert.equal(result.guides.length, 1);
  const guide = result.guides[0];
  assert.equal(guide.orientation, 'horizontal');
  assert.equal(guide.lineCoord, 100);
  // Spans across candidate 1 (minX 50) and candidate 2 (maxX 400) + padding
  assert.ok(guide.start <= 50);
  assert.ok(guide.end >= 400);
});

test('calculateSmartGuidesAndSnap: supports circular elements (centered geometry)', () => {
  // Circle at x: 300, y: 300 with radius 50 (left: 250, right: 350, top: 250, bottom: 350, center: 300, 300)
  const circle = {
    id: 'c-1',
    type: 'circle',
    x: 300,
    y: 300,
    radius: 50,
  };

  // Dragged rect at x: 248, y: 500 (diff 2px from circle left edge 250)
  const draggedBounds = { x: 248, y: 500, w: 100, h: 100 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds,
    candidateElements: [circle],
    tolerance: 5,
  });

  assert.equal(result.hasSnapX, true);
  assert.equal(result.snappedX, 250);
  assert.equal(result.guides[0].lineCoord, 250);
});

test('calculateSmartGuidesAndSnap: snaps right edge of moving group to left edge of target', () => {
  const target = {
    id: 't-1',
    type: 'sticky',
    x: 500,
    y: 200,
    width: 200,
    height: 200,
  };

  // Multi-selection group bounding box with width 300.
  // Group at x: 198, so right edge is 198 + 300 = 498 (2px away from target.left = 500)
  const groupBounds = { x: 198, y: 200, w: 300, h: 200 };
  const result = calculateSmartGuidesAndSnap({
    draggedBounds: groupBounds,
    candidateElements: [target],
    tolerance: 6,
  });

  assert.equal(result.hasSnapX, true);
  assert.equal(result.snappedX, 200); // 200 + 300 = 500
  assert.equal(result.deltaX, 2);
  assert.equal(result.guides.length, 2); // Also snaps on Y (top matches top: 200)
});

test('calculateSmartGuidesAndSnap: scales tolerance properly at different zoom levels', () => {
  const target = {
    id: 't-1',
    type: 'rect',
    x: 1000,
    y: 1000,
    width: 100,
    height: 100,
  };

  // At 50% zoom (scale = 0.5), 8 physical screen pixels corresponds to 16 world units.
  const toleranceZoomOut = 8 / 0.5; // 16
  const draggedZoomOut = { x: 988, y: 1000, w: 100, h: 100 }; // 12 units away

  const resZoomOut = calculateSmartGuidesAndSnap({
    draggedBounds: draggedZoomOut,
    candidateElements: [target],
    tolerance: toleranceZoomOut,
  });
  assert.equal(resZoomOut.hasSnapX, true);
  assert.equal(resZoomOut.snappedX, 1000);

  // At 200% zoom (scale = 2.0), 8 physical screen pixels corresponds to 4 world units.
  const toleranceZoomIn = 8 / 2.0; // 4
  const draggedZoomIn = { x: 994, y: 1000, w: 100, h: 100 }; // 6 units away (> 4 tolerance)

  const resZoomIn = calculateSmartGuidesAndSnap({
    draggedBounds: draggedZoomIn,
    candidateElements: [target],
    tolerance: toleranceZoomIn,
  });
  assert.equal(resZoomIn.hasSnapX, false);
});
