import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SelectionContextBar: Stroke width is standardized to Select matching font size pattern', () => {
  const componentPath = path.resolve('src/components/whiteboard/SelectionContextBar.tsx');
  assert.ok(fs.existsSync(componentPath), 'SelectionContextBar.tsx deve existir');

  const content = fs.readFileSync(componentPath, 'utf8');

  // 1. Deve possuir StrokeWidthSelectItem definido
  assert.match(
    content,
    /const StrokeWidthSelectItem: React\.FC<StrokeWidthSelectItemProps>/,
    'Deve definir StrokeWidthSelectItem com tipagem'
  );

  // 2. Presets padronizados para espessura de traço
  assert.match(
    content,
    /const STROKE_WIDTH_PRESETS = \[1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 48\];/,
    'Deve definir STROKE_WIDTH_PRESETS com progressão padrão'
  );

  // 3. O item de seleção deve ter escala visual para a linha e 'px'
  assert.match(
    content,
    /lineThickness = Math\.max\(1, Math\.min\(8, Math\.round\(1 \+ Math\.log2\(w\) \* 1\.3\)\)\)/,
    'Deve ter escala visual da linha de espessura'
  );

  // 4. Seleção individual NÃO deve usar Popover para espessura de traço
  assert.doesNotMatch(
    content,
    /isStrokeWidthPopoverOpen/,
    'Não deve mais conter isStrokeWidthPopoverOpen'
  );
  assert.match(
    content,
    /isStrokeWidthSelectOpen/,
    'Deve usar isStrokeWidthSelectOpen'
  );

  // 5. Seleção em lote NÃO deve usar Popover para espessura de traço
  assert.doesNotMatch(
    content,
    /isBatchStrokeWidthPopoverOpen/,
    'Não deve mais conter isBatchStrokeWidthPopoverOpen'
  );
  assert.match(
    content,
    /isBatchStrokeWidthSelectOpen/,
    'Deve usar isBatchStrokeWidthSelectOpen'
  );

  // 6. Eliminação completa das antigas grades 4x3 de botões de espessura
  assert.doesNotMatch(
    content,
    /Grade de Espessuras Rápidas/,
    'Não deve mais conter a grade antiga de espessuras rápidas'
  );

  // 7. Suporte a formas geométricas no controle de espessura em lote
  assert.match(
    content,
    /isGeometricShape\(e\.type\)/,
    'Seleção em lote deve abranger formas geométricas no controle de espessura'
  );
});

test('SelectionContextBar: Follows Emil Kowalski design engineering principles', () => {
  const componentPath = path.resolve('src/components/whiteboard/SelectionContextBar.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  // Emil Kowalski Rule: Responsive press feedback (active:scale-[0.95] or active:scale-[0.97])
  assert.match(
    content,
    /active:scale-\[0\.95\]/,
    'Steppers devem ter feedback tátil ao pressionar (active:scale-[0.95])'
  );

  // Emil Kowalski Rule: Select trigger with clean feedback
  assert.match(
    content,
    /SelectTrigger[\s\S]*?aria-label="Espessura/,
    'SelectTrigger deve possuir aria-label descritivo'
  );
});
