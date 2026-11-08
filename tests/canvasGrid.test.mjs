import test from 'node:test';
import assert from 'node:assert/strict';

test('Grid types and sizes configuration', () => {
  const GRID_SIZE_VALUES = {
    small: 24,
    medium: 40,
    large: 64,
  };

  const validTypes = ['dots', 'lines', 'crosses', 'hybrid', 'isometric', 'none'];

  assert.equal(GRID_SIZE_VALUES.small, 24);
  assert.equal(GRID_SIZE_VALUES.medium, 40);
  assert.equal(GRID_SIZE_VALUES.large, 64);
  assert.equal(validTypes.length, 6);
  assert.ok(validTypes.includes('hybrid'));
  assert.ok(validTypes.includes('dots'));
  assert.ok(validTypes.includes('lines'));
  assert.ok(validTypes.includes('crosses'));
  assert.ok(validTypes.includes('isometric'));
});

test('Grid offset calculations stay aligned with stage movement and zoom scale', () => {
  const calculateGridOffset = (pos, scaledSize) => {
    return ((pos % scaledSize) + scaledSize) % scaledSize;
  };

  const scaledSize = 40 * 1.5; // 60px
  assert.equal(calculateGridOffset(0, scaledSize), 0);
  assert.equal(calculateGridOffset(60, scaledSize), 0);
  assert.equal(calculateGridOffset(120, scaledSize), 0);
  assert.equal(calculateGridOffset(-30, scaledSize), 30);
  assert.equal(calculateGridOffset(25, scaledSize), 25);
});

test('Grid persistence parsing handles defaults safely', () => {
  const parseShowGrid = (stored) => {
    return stored !== null ? stored !== 'false' : true;
  };

  const parseGridType = (stored) => {
    const valid = ['dots', 'lines', 'crosses', 'hybrid', 'isometric', 'none'];
    return valid.includes(stored) ? stored : 'hybrid';
  };

  const parseGridSize = (stored) => {
    const valid = ['small', 'medium', 'large'];
    return valid.includes(stored) ? stored : 'medium';
  };

  assert.equal(parseShowGrid(null), true);
  assert.equal(parseShowGrid('true'), true);
  assert.equal(parseShowGrid('false'), false);

  assert.equal(parseGridType(null), 'hybrid');
  assert.equal(parseGridType('isometric'), 'isometric');
  assert.equal(parseGridType('invalid_type'), 'hybrid');

  assert.equal(parseGridSize(null), 'medium');
  assert.equal(parseGridSize('small'), 'small');
  assert.equal(parseGridSize('unknown'), 'medium');
});

test('Grid opacity configuration and persistence parsing handles clamping and defaults', () => {
  const DEFAULT_GRID_OPACITY = 0.55;

  const parseGridOpacity = (stored) => {
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 1.0) {
        return parsed;
      }
    }
    return DEFAULT_GRID_OPACITY;
  };

  const clampGridOpacity = (val) => {
    return Math.max(0.1, Math.min(1.0, typeof val === 'number' && !isNaN(val) ? val : DEFAULT_GRID_OPACITY));
  };

  // Testes de parsing com valores do localStorage
  assert.equal(parseGridOpacity(null), 0.55);
  assert.equal(parseGridOpacity('0.3'), 0.3);
  assert.equal(parseGridOpacity('0.9'), 0.9);
  assert.equal(parseGridOpacity('0.05'), 0.55); // fora dos limites mínimos
  assert.equal(parseGridOpacity('1.5'), 0.55); // fora dos limites máximos
  assert.equal(parseGridOpacity('not-a-number'), 0.55);

  // Testes de clamping do componente CanvasGrid
  assert.equal(clampGridOpacity(0.05), 0.1);
  assert.equal(clampGridOpacity(1.5), 1.0);
  assert.equal(clampGridOpacity(0.35), 0.35);
  assert.equal(clampGridOpacity(undefined), 0.55);
  assert.equal(clampGridOpacity(NaN), 0.55);
});
