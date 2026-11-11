import test from 'node:test';
import assert from 'node:assert/strict';
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
