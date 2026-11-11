import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createDefaultChecklistItems,
  convertStickyToChecklist,
  convertChecklistToSticky,
  computeChecklistProgress,
  computeChecklistHeight,
} from '../src/utils/checklist.ts';

test('createDefaultChecklistItems generates 3 non-empty tasks', () => {
  const items = createDefaultChecklistItems();
  assert.equal(items.length, 3);
  assert.equal(items[0].completed, false);
  assert.ok(items[0].id.startsWith('chk_'));
  assert.ok(items[0].text.length > 0);
});

test('convertStickyToChecklist splits lines and strips bullets', () => {
  const text = `
    # Minhas Tarefas
    - [x] Primeira tarefa concluída
    * Segunda tarefa em andamento
    1. Terceira tarefa pendente
    • Quarta com bullet redondo
  `;
  const result = convertStickyToChecklist(text);
  assert.equal(result.title, 'Minhas Tarefas');
  assert.equal(result.items.length, 4);
  assert.equal(result.items[0].text, 'Primeira tarefa concluída');
  assert.equal(result.items[0].completed, true);
  assert.equal(result.items[1].text, 'Segunda tarefa em andamento');
  assert.equal(result.items[1].completed, false);
  assert.equal(result.items[2].text, 'Terceira tarefa pendente');
  assert.equal(result.items[3].text, 'Quarta com bullet redondo');
});

test('convertStickyToChecklist handles empty text gracefully', () => {
  const result = convertStickyToChecklist('');
  assert.equal(result.title, 'Lista de Tarefas');
  assert.equal(result.items.length, 3);
});

test('convertChecklistToSticky formats tasks into readable text', () => {
  const items = [
    { id: '1', text: 'Revisar código', completed: true },
    { id: '2', text: 'Rodar build', completed: false },
  ];
  const stickyText = convertChecklistToSticky(items, 'Sprint 10');
  assert.ok(stickyText.includes('**Sprint 10**'));
  assert.ok(stickyText.includes('[x] Revisar código'));
  assert.ok(stickyText.includes('[ ] Rodar build'));
});

test('computeChecklistProgress calculates percentage correctly', () => {
  const empty = computeChecklistProgress([]);
  assert.deepEqual(empty, { total: 0, completed: 0, percentage: 0 });

  const items = [
    { id: '1', text: 'A', completed: true },
    { id: '2', text: 'B', completed: false },
    { id: '3', text: 'C', completed: true },
  ];
  const progress = computeChecklistProgress(items);
  assert.equal(progress.total, 3);
  assert.equal(progress.completed, 2);
  assert.equal(progress.percentage, 67);

  const completedItems = [
    { id: '1', text: 'A', completed: true },
    { id: '2', text: 'B', completed: true },
  ];
  assert.equal(computeChecklistProgress(completedItems).percentage, 100);
});

test('computeChecklistHeight scales cleanly', () => {
  const h0 = computeChecklistHeight(0);
  assert.ok(h0 >= 180);
  const h5 = computeChecklistHeight(5);
  assert.ok(h5 > h0);
});

test('ChecklistItem component: supports drag events, position persistence, and guards during drag', () => {
  const source = fs.readFileSync(path.resolve('src/components/whiteboard/ChecklistItem.tsx'), 'utf8');

  // ChecklistItem deve salvar posição x e y no onDragEnd
  assert.ok(
    source.includes('onDragEnd=') && source.includes('Math.round(e.target.x())') && source.includes('Math.round(e.target.y())'),
    'ChecklistItem must persist x and y position on onDragEnd via onChange'
  );

  // ChecklistItem deve suportar onDragStart e onTransformEnd
  assert.ok(source.includes('onDragStart='), 'ChecklistItem must have onDragStart');
  assert.ok(source.includes('onTransformEnd='), 'ChecklistItem must have onTransformEnd');

  // ChecklistItem deve guardar cliques em botões e checkboxes durante o arraste
  assert.ok(source.includes('isDraggingRef.current'), 'ChecklistItem must guard interactions with isDraggingRef');
});

test('WhiteboardCanvas: synchronizes active checklist editor input with element position during drag and viewport navigation', () => {
  const source = fs.readFileSync(path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'), 'utf8');

  // Editor inline do checklist deve ter ID dedicado para sincronização direta no DOM
  assert.ok(
    source.includes('id={`checklist-editor-input-${elem.id}`}'),
    'Checklist editor input must have checklist-editor-input ID for fast DOM synchronization'
  );

  // onDragMove deve atualizar posição do checklist editor input em tempo real
  assert.ok(
    source.includes('updateChecklistEditorInputPos') &&
    source.includes('updateChecklistEditorInputPos(targetId, e.target.x(), e.target.y())'),
    'onDragMove must update active checklist editor input position with 0ms latency during drag'
  );

  // syncWorldOverlays deve manter o input alinhado com o palco durante pan e zoom
  assert.ok(
    source.includes('activeChecklistEditorRef.current') &&
    source.includes('checklist-editor-input-'),
    'syncWorldOverlays must keep checklist editor input aligned during viewport pan and zoom'
  );

  // top position deve resolver a linha da tarefa dinamicamente
  assert.ok(
    source.includes('resolvedItemY'),
    'WhiteboardCanvas must resolve itemY dynamically for the checklist item'
  );
});
