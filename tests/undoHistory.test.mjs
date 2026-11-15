import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diffElementsToPatch,
  applyPatchToState,
  shouldCoalescePatches,
  mergePatches,
  COALESCE_WINDOW_MS,
} from '../src/utils/undoHistory.ts';

const baseElement = {
  id: 's1',
  type: 'sticky',
  x: 100,
  y: 150,
  width: 200,
  height: 180,
  fill: '#fff3c4',
  text: 'Hello',
  zIndex: 1,
  updatedBy: 'u1',
  updatedByName: 'Ana',
  updatedAt: 1,
};

test('diffElementsToPatch: mudança de posição gera patch modify só com x/y', () => {
  const before = [{ ...baseElement }];
  const after = [{ ...baseElement, x: 300, y: 400, updatedBy: 'u1', updatedAt: 2 }];
  const patch = diffElementsToPatch(before, after);

  assert.ok(patch);
  assert.equal(patch.entries.length, 1);
  const entry = patch.entries[0];
  assert.equal(entry.kind, 'modify');
  assert.equal(entry.id, 's1');
  assert.deepEqual(entry.before, { x: 100, y: 150 });
  assert.deepEqual(entry.after, { x: 300, y: 400 });
});

test('diffElementsToPatch: campos de metadados (updatedAt/updatedBy) não entram no patch', () => {
  const before = [{ ...baseElement }];
  const after = [{ ...baseElement, updatedBy: 'u2', updatedByName: 'Bruno', updatedAt: 99 }];
  const patch = diffElementsToPatch(before, after);
  assert.equal(patch, null);
});

test('diffElementsToPatch: criação gera entry create com after completo', () => {
  const newElement = { ...baseElement, id: 's2', text: 'Nova' };
  const patch = diffElementsToPatch([{ ...baseElement }], [{ ...baseElement }, newElement]);

  assert.ok(patch);
  assert.equal(patch.entries.length, 1);
  assert.equal(patch.entries[0].kind, 'create');
  assert.equal(patch.entries[0].id, 's2');
  assert.equal(patch.entries[0].before, null);
  assert.equal(patch.entries[0].after?.text, 'Nova');
});

test('diffElementsToPatch: deleção gera entry delete com before completo', () => {
  const patch = diffElementsToPatch([{ ...baseElement }], []);
  assert.ok(patch);
  assert.equal(patch.entries[0].kind, 'delete');
  assert.equal(patch.entries[0].after, null);
  assert.equal(patch.entries[0].before?.text, 'Hello');
});

test('diffElementsToPatch: retorna null quando nada mudou', () => {
  const state = [{ ...baseElement }];
  assert.equal(diffElementsToPatch(state, state.map((e) => ({ ...e }))), null);
});

test('applyPatchToState undo: reverte apenas os campos do patch, preservando edições alheias', () => {
  // O patch contém APENAS a mudança de posição (Ana moveu o elemento)
  const before = [{ ...baseElement, x: 100 }];
  const after = [{ ...baseElement, x: 300 }];
  const patch = diffElementsToPatch(before, after);

  // Depois Bruno mudou a cor por cima (edição alheia, fora do patch)
  const conflicted = [{ ...after[0], fill: '#ffcccc' }];
  const restored = applyPatchToState(conflicted, patch, 'undo');

  assert.equal(restored[0].x, 100, 'posição minha deve voltar');
  assert.equal(restored[0].fill, '#ffcccc', 'cor editada por outro deve ser preservada');
});

test('applyPatchToState: undo de criação remove o elemento; redo re-adiciona', () => {
  const created = { ...baseElement, id: 's2' };
  const patch = diffElementsToPatch([], [created]);

  const afterUndo = applyPatchToState([created], patch, 'undo');
  assert.equal(afterUndo.length, 0);

  const afterRedo = applyPatchToState(afterUndo, patch, 'redo');
  assert.equal(afterRedo.length, 1);
  assert.equal(afterRedo[0].id, 's2');
});

test('applyPatchToState: undo de deleção restaura o elemento completo', () => {
  const deleted = { ...baseElement };
  const patch = diffElementsToPatch([deleted], []);

  const restored = applyPatchToState([], patch, 'undo');
  assert.equal(restored.length, 1);
  assert.equal(restored[0].text, 'Hello');
  assert.equal(restored[0].x, 100);

  const reDeleted = applyPatchToState(restored, patch, 'redo');
  assert.equal(reDeleted.length, 0);
});

test('applyPatchToState: modify em elemento apagado por outro usuário é ignorado sem erro', () => {
  const before = [{ ...baseElement }];
  const after = [{ ...baseElement, x: 300 }];
  const patch = diffElementsToPatch(before, after);
  const restored = applyPatchToState([], patch, 'undo');
  assert.deepEqual(restored, []);
});

test('shouldCoalescePatches: arrastos contínuos dos mesmos elementos se fundem', () => {
  const p1 = diffElementsToPatch(
    [{ ...baseElement }],
    [{ ...baseElement, x: 110, y: 160 }]
  );
  const p2 = diffElementsToPatch(
    [{ ...baseElement, x: 110, y: 160 }],
    [{ ...baseElement, x: 120, y: 170 }]
  );
  assert.ok(p1 && p2);
  assert.ok(p2.timestamp - p1.timestamp < COALESCE_WINDOW_MS);
  assert.ok(shouldCoalescePatches(p1, p2));

  const merged = mergePatches(p1, p2);
  assert.equal(merged.entries.length, 1);
  assert.deepEqual(merged.entries[0].before, { x: 100, y: 150 });
  assert.deepEqual(merged.entries[0].after, { x: 120, y: 170 });

  // Undo do patch fundido volta ao estado original em um passo
  const restored = applyPatchToState([{ ...baseElement, x: 120, y: 170 }], merged, 'undo');
  assert.equal(restored[0].x, 100);
  assert.equal(restored[0].y, 150);
});

test('shouldCoalescePatches: ações discretas (cor, lock, texto) NUNCA se fundem', () => {
  const p1 = diffElementsToPatch(
    [{ ...baseElement }],
    [{ ...baseElement, x: 110 }]
  );
  const p2 = diffElementsToPatch(
    [{ ...baseElement, x: 110 }],
    [{ ...baseElement, x: 110, fill: '#ffcccc' }]
  );
  assert.ok(p1 && p2);
  assert.equal(shouldCoalescePatches(p1, p2), false);
});

test('shouldCoalescePatches: janela expirada não funde mesmo com campos contínuos', () => {
  const t = Date.now();
  const p1 = { entries: [{ id: 's1', kind: 'modify', before: { x: 1 }, after: { x: 2 } }], timestamp: t };
  const p2 = { entries: [{ id: 's1', kind: 'modify', before: { x: 2 }, after: { x: 3 } }], timestamp: t + COALESCE_WINDOW_MS + 1 };
  assert.equal(shouldCoalescePatches(p1, p2), false);
});

test('shouldCoalescePatches: patches de elementos diferentes não se fundem', () => {
  const t = Date.now();
  const p1 = { entries: [{ id: 's1', kind: 'modify', before: { x: 1 }, after: { x: 2 } }], timestamp: t };
  const p2 = { entries: [{ id: 's2', kind: 'modify', before: { x: 1 }, after: { x: 2 } }], timestamp: t + 10 };
  assert.equal(shouldCoalescePatches(p1, p2), false);
});
