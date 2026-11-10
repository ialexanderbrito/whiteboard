import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('WhiteboardCanvas: sticky notes are created directly in authentic post-it format without forcing inlineEditing', () => {
  const canvasSource = fs.readFileSync(
    path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'),
    'utf8'
  );

  // 1. Criação no clique do mouse não deve disparar setInlineEditing imediatamente
  const clickCreationMatch = canvasSource.match(/if \(currentTool === 'sticky'\)\s*\{([\s\S]*?)onSelectTool\('select'\);/);
  assert.ok(clickCreationMatch, 'Should find sticky creation block in handleMouseDown');
  assert.ok(
    !clickCreationMatch[1].includes('setInlineEditing'),
    'Click creation must NOT immediately open setInlineEditing, allowing post-it format to render'
  );

  // 2. Menu de contexto não deve disparar setInlineEditing imediatamente
  const contextMenuStickyMatch = canvasSource.match(/handleContextMenuCreateSticky = async[\s\S]*?onSelectTool\('select'\);/);
  assert.ok(contextMenuStickyMatch, 'Should find handleContextMenuCreateSticky');
  assert.ok(
    !contextMenuStickyMatch[0].includes('setInlineEditing'),
    'Context menu creation must NOT immediately open setInlineEditing'
  );

  // 3. Quick-Add (+) não deve disparar setInlineEditing imediatamente
  const quickAddMatch = canvasSource.match(/if \(selectedQuickAddElement\.type === 'sticky'\)\s*\{([\s\S]*?)return;\s*\}/);
  assert.ok(quickAddMatch, 'Should find quick-add sticky block');
  assert.ok(
    !quickAddMatch[1].includes('setInlineEditing'),
    'Quick-add sticky creation must NOT immediately open setInlineEditing'
  );

  // 4. Transformer deve ocultar alças quando qualquer elemento estiver em edição inline
  assert.ok(
    canvasSource.includes('if (inlineEditing?.elementId === id) {'),
    'Transformer must hide anchors during inline editing of any element'
  );

  // 5. Suporte a Enter para iniciar edição no post-it selecionado
  assert.ok(
    canvasSource.includes("e.key === 'Enter'") && canvasSource.includes("handleStartEditingElement(sel.id)"),
    'WhiteboardCanvas must support Enter key to start editing a selected element'
  );

  // 6. Textarea de edição de post-it deve ter proporções fiéis ao post-it
  assert.ok(
    canvasSource.includes("inlineEditing.type === 'sticky'") &&
    canvasSource.includes('inlineEditing.width * scale') &&
    canvasSource.includes('inlineEditing.height * scale'),
    'Inline textarea must scale proportionally for sticky notes without aspect-ratio distortion'
  );
});
