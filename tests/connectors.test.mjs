import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCardinalAnchors,
  getElementAnchors,
  resolveAutoSide,
  getClosestAnchor,
  resolveBindingPoint,
  calculateStraightPoints,
  calculateCurvedPoints,
  calculateOrthogonalPoints,
  resolveConnectorGeometry,
  findNearestSnapAnchor,
  getConnectedArrowUpdatesOnMove,
} from '../src/utils/connectors.ts';

test('getCardinalAnchors and getElementAnchors calculate correct anchors', () => {
  const bounds = { x: 100, y: 100, w: 200, h: 100 };
  const anchors = getCardinalAnchors(bounds);

  assert.deepEqual(anchors.top, { x: 200, y: 100 });
  assert.deepEqual(anchors.right, { x: 300, y: 150 });
  assert.deepEqual(anchors.bottom, { x: 200, y: 200 });
  assert.deepEqual(anchors.left, { x: 100, y: 150 });
  assert.deepEqual(anchors.center, { x: 200, y: 150 });

  const sticky = {
    id: 's1',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const elAnchors = getElementAnchors(sticky);
  assert.deepEqual(elAnchors.right, { x: 300, y: 150 });
});

test('resolveBindingPoint and calculateStraightPoints operate accurately', () => {
  const sticky = {
    id: 's1',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const map = new Map([['s1', sticky]]);
  const pt = resolveBindingPoint({ elementId: 's1', side: 'right' }, map);
  assert.ok(pt);
  assert.equal(pt.x, 300);
  assert.equal(pt.y, 150);

  const straight = calculateStraightPoints({ x: 10, y: 20 }, { x: 30, y: 40 });
  assert.deepEqual(straight, [10, 20, 30, 40]);
});

test('resolveAutoSide selects the closest cardinal facing direction', () => {
  const bounds = { x: 100, y: 100, w: 100, h: 100 }; // center at 150, 150

  assert.equal(resolveAutoSide(bounds, { x: 300, y: 150 }), 'right');
  assert.equal(resolveAutoSide(bounds, { x: 0, y: 150 }), 'left');
  assert.equal(resolveAutoSide(bounds, { x: 150, y: 300 }), 'bottom');
  assert.equal(resolveAutoSide(bounds, { x: 150, y: 0 }), 'top');
});

test('getClosestAnchor returns the nearest anchor to a given mouse/pointer position', () => {
  const sticky = {
    id: 's1',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };

  const nearTop = getClosestAnchor({ x: 200, y: 95 }, sticky);
  assert.equal(nearTop.side, 'top');
  assert.deepEqual(nearTop.point, { x: 200, y: 100 });

  const nearRight = getClosestAnchor({ x: 310, y: 200 }, sticky);
  assert.equal(nearRight.side, 'right');
  assert.deepEqual(nearRight.point, { x: 300, y: 200 });
});

test('calculateOrthogonalPoints generates 90-degree stepped paths', () => {
  const start = { x: 100, y: 100 };
  const end = { x: 300, y: 200 };

  // Horizontal exit and horizontal entry (right -> left)
  const points = calculateOrthogonalPoints(start, 'right', end, 'left');
  assert.equal(points.length, 8);
  assert.equal(points[0], 100);
  assert.equal(points[1], 100);
  assert.equal(points[2], 200); // midX
  assert.equal(points[3], 100);
  assert.equal(points[4], 200); // midX
  assert.equal(points[5], 200);
  assert.equal(points[6], 300);
  assert.equal(points[7], 200);
});

test('calculateCurvedPoints generates bezier control points with natural normal orientation', () => {
  const start = { x: 100, y: 100 };
  const end = { x: 300, y: 100 };

  const points = calculateCurvedPoints(start, 'right', end, 'left');
  assert.equal(points.length, 8); // start, cp1, cp2, end
  assert.equal(points[0], 100);
  assert.equal(points[1], 100);
  assert.ok(points[2] > 100); // cp1 projected right
  assert.ok(points[4] < 300); // cp2 projected left
  assert.equal(points[6], 300);
  assert.equal(points[7], 100);
});

test('resolveConnectorGeometry resolves dynamic positions when elements move', () => {
  const stickyA = {
    id: 'sA',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const stickyB = {
    id: 'sB',
    type: 'sticky',
    x: 500,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 2,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const arrow = {
    id: 'arr1',
    type: 'arrow',
    x: 0,
    y: 0,
    points: [0, 0, 100, 100],
    startBinding: { elementId: 'sA', side: 'right' },
    endBinding: { elementId: 'sB', side: 'left' },
    connectorStyle: 'straight',
    zIndex: 3,
    updatedBy: 'u1',
    updatedAt: 1,
  };

  const map = new Map([
    ['sA', stickyA],
    ['sB', stickyB],
  ]);

  const geom = resolveConnectorGeometry(arrow, map);
  assert.deepEqual(geom.worldStart, { x: 300, y: 200 }); // right side of sA (100 + 200)
  assert.deepEqual(geom.worldEnd, { x: 500, y: 200 }); // left side of sB (500)
  assert.deepEqual(geom.routePoints, [300, 200, 500, 200]);
});

test('findNearestSnapAnchor snaps to closest element within threshold distance', () => {
  const sticky = {
    id: 's1',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };

  const hit = findNearestSnapAnchor({ x: 315, y: 205 }, [sticky], 30);
  assert.ok(hit);
  assert.equal(hit.element.id, 's1');
  assert.equal(hit.side, 'right');
  assert.deepEqual(hit.anchorPoint, { x: 300, y: 200 });

  const miss = findNearestSnapAnchor({ x: 450, y: 450 }, [sticky], 30);
  assert.equal(miss, null);
});

test('getConnectedArrowUpdatesOnMove recalculates arrow points when attached elements move', () => {
  const stickyA = {
    id: 'sA',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const stickyB = {
    id: 'sB',
    type: 'sticky',
    x: 500,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 2,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const arrow = {
    id: 'arr1',
    type: 'arrow',
    x: 300,
    y: 200,
    points: [0, 0, 200, 0],
    startBinding: { elementId: 'sA', side: 'right' },
    endBinding: { elementId: 'sB', side: 'left' },
    connectorStyle: 'straight',
    zIndex: 3,
    updatedBy: 'u1',
    updatedAt: 1,
  };

  const movedStickyB = { ...stickyB, x: 600, y: 150 }; // moved further right and down
  const allElements = [stickyA, stickyB, arrow];

  const updates = getConnectedArrowUpdatesOnMove([movedStickyB], allElements);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 'arr1');
  assert.equal(updates[0].updates.x, 300); // start at sA right (100+200)
  assert.equal(updates[0].updates.y, 200); // sA center Y
  // end is at sB left: 600, center Y: 150 + 100 = 250
  assert.deepEqual(updates[0].updates.points, [0, 0, 300, 50]);
});

test('WhiteboardCanvas and Toolbar: line and arrow are unified connectors separated from shapes', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const canvasSource = fs.readFileSync(path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'), 'utf-8');
  const toolbarSource = fs.readFileSync(path.resolve('src/components/whiteboard/Toolbar.tsx'), 'utf-8');

  // WhiteboardCanvas inicia desenho tanto para 'arrow' quanto para 'line'
  assert.ok(
    canvasSource.includes("currentTool === 'arrow' || currentTool === 'line'"),
    'WhiteboardCanvas deve iniciar desenho para arrow e line'
  );
  assert.ok(
    canvasSource.includes("finishedDrawing.type === 'arrow' || finishedDrawing.type === 'line'"),
    'WhiteboardCanvas deve finalizar e persistir desenho para arrow e line'
  );

  // Toolbar não mistura conectores dentro do submenu de formas geométricas
  assert.ok(
    toolbarSource.includes("activePicker === 'connectors'"),
    'Toolbar deve possuir picker dedicado para conectores'
  );
  assert.ok(
    !toolbarSource.includes('allShapesAndConnectors'),
    'Toolbar não deve misturar conectores na lista de formas'
  );
});

