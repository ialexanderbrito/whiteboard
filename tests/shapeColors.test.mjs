import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  SHAPE_FILL_COLORS, 
  SHAPE_FILL_CATEGORIES, 
  SHAPE_QUICK_SWATCHES,
  STICKY_COLORS,
  STROKE_COLORS,
  TEXT_COLORS 
} from '../src/utils/colors.ts';

test('Shape Fill Colors: expanded palette contains significantly more than standard 8 colors', () => {
  assert.ok(SHAPE_FILL_COLORS.length >= 24, `Deve conter mais cores expandidas (atual: ${SHAPE_FILL_COLORS.length})`);
});

test('Shape Fill Colors: preserves all original standard colors for backwards compatibility', () => {
  const originalColors = [
    '#ffffff',
    'transparent',
    '#fef08a',
    '#bbf7d0',
    '#bae6fd',
    '#e9d5ff',
    '#fed7aa',
    '#334155'
  ];

  for (const orig of originalColors) {
    const found = SHAPE_FILL_COLORS.some(c => c.value.toLowerCase() === orig.toLowerCase());
    assert.ok(found, `Cor original ${orig} deve estar presente na lista`);
  }
});

test('Shape Fill Categories: structured into pastels, vibrant, and neutrals/dark tones', () => {
  assert.equal(SHAPE_FILL_CATEGORIES.length, 3);
  const categoryNames = SHAPE_FILL_CATEGORIES.map(c => c.name);
  assert.ok(categoryNames.includes('Tons Pastéis & Suaves'));
  assert.ok(categoryNames.includes('Tons Vivos & Vibrantes'));
  assert.ok(categoryNames.includes('Neutros & Escuros'));

  for (const cat of SHAPE_FILL_CATEGORIES) {
    assert.ok(cat.colors.length >= 6, `Categoria ${cat.name} deve ter pelo menos 6 opções`);
    for (const c of cat.colors) {
      assert.ok(c.name && c.value);
      if (c.value !== 'transparent') {
        assert.ok(c.value.startsWith('#'), `Valor de cor ${c.value} deve ser hex ou transparent`);
      }
    }
  }
});

test('Shape Quick Swatches: provides direct 1-click shape fill swatches', () => {
  assert.ok(SHAPE_QUICK_SWATCHES.length >= 6);
  assert.ok(SHAPE_QUICK_SWATCHES.some(c => c.value === '#ffffff'));
  assert.ok(SHAPE_QUICK_SWATCHES.some(c => c.value === 'transparent'));
});
