import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sortElementsByLayer,
  getNextZIndex,
  diffZIndexUpdates,
  computeLayerReorderUpdates,
  moveBlockInLayerOrder,
  getLayerLabel,
  resolveLayerShortcut,
} from '../src/utils/layerOrder.ts';

// Helper: cria elementos com zIndex (e createdAt decrescente para testar desempate)
const el = (id, zIndex, updatedAt = 0) => ({ id, type: 'rect', zIndex, updatedAt });

const ids = (updates) => updates.map((u) => u.id);

test('sortElementsByLayer ordena por zIndex com desempate determinístico por updatedAt', () => {
  const elements = [
    el('c', 2, 100),
    el('a', 1, 300),
    el('b', 1, 100), // empata com 'c' em zIndex, mas tem updatedAt menor
    el('d', 1, 100), // empata com 'b' em tudo — desempate por id
  ];
  const sorted = sortElementsByLayer(elements);
  assert.deepEqual(
    sorted.map((e) => e.id),
    ['b', 'd', 'a', 'c']
  );
});

test('getNextZIndex retorna máximo existente + 1 (sobrevive a buracos pós-deleção)', () => {
  const elements = [el('a', 1), el('b', 5), el('c', 2)];
  assert.equal(getNextZIndex(elements), 6);
  assert.equal(getNextZIndex([]), 1);
});

test('diffZIndexUpdates renormaliza 1..n e só reporta valores alterados', () => {
  const elements = [el('a', 1), el('b', 10), el('c', 20)];
  const updates = diffZIndexUpdates(elements);
  assert.deepEqual(updates, [
    { id: 'b', updates: { zIndex: 2 } },
    { id: 'c', updates: { zIndex: 3 } },
  ]);
});

test('bringForward faz swap real sem colisão em pilha densa', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3)];
  const updates = computeLayerReorderUpdates(elements, ['a'], 'bringForward');
  // a deve trocar de lugar com b, sem empatar com c
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  assert.deepEqual(sorted, ['b', 'a', 'c']);
  // Sem empates: todos os zIndex são distintos
  const zs = applied.map((e) => e.zIndex);
  assert.equal(new Set(zs).size, zs.length);
});

test('sendBackward faz swap real e nunca fica preso no fundo empatado', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3)];
  const updates = computeLayerReorderUpdates(elements, ['c'], 'sendBackward');
  assert.deepEqual(ids(updates), ['c', 'b']);
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  assert.deepEqual(sorted, ['a', 'c', 'b']);
  const zs = applied.map((e) => e.zIndex);
  assert.equal(new Set(zs).size, zs.length);
});

test('sendToBack com múltiplos selecionados preserva ordem relativa e não empata em 1', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3), el('d', 4)];
  const updates = computeLayerReorderUpdates(elements, ['c', 'd'], 'sendToBack');
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  // c vai antes de d (ordem relativa preservada), ambos atrás de a e b
  assert.deepEqual(sorted, ['c', 'd', 'a', 'b']);
  // Ninguém empatado em 1
  const zs = applied.map((e) => e.zIndex);
  assert.deepEqual(new Set(zs).size, zs.length);
  assert.deepEqual(zs, [3, 4, 1, 2]);
});

test('bringToFront com múltiplos selecionados preserva ordem relativa', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3), el('d', 4)];
  const updates = computeLayerReorderUpdates(elements, ['b', 'd'], 'bringToFront');
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  assert.deepEqual(sorted, ['a', 'c', 'b', 'd']);
});

// ---------------------------------------------------------------------------
// resolveLayerShortcut: detecção de ] / [ robusta a layouts de teclado.
// Os eventos abaixo replicam o que o navegador reporta em cada layout real.
// ---------------------------------------------------------------------------
test('resolveLayerShortcut: layout US (e.key e e.code concordam)', () => {
  assert.equal(resolveLayerShortcut({ key: ']', code: 'BracketRight', altKey: false }), 'bringToFront');
  assert.equal(resolveLayerShortcut({ key: '[', code: 'BracketLeft', altKey: false }), 'sendToBack');
});

test('resolveLayerShortcut: Shift transforma e.key em } / { (Ctrl+Shift não é mais obrigatório)', () => {
  assert.equal(resolveLayerShortcut({ key: '}', code: 'BracketRight', altKey: false }), 'bringToFront');
  assert.equal(resolveLayerShortcut({ key: '{', code: 'BracketLeft', altKey: false }), 'sendToBack');
});

test('resolveLayerShortcut: ABNT2 — e.key correto mesmo com e.code deslocado (bug do Windows)', () => {
  // No ABNT2 a tecla ']' reporta code 'Backslash' e a '[' reporta 'BracketRight'
  assert.equal(resolveLayerShortcut({ key: ']', code: 'Backslash', altKey: false }), 'bringToFront');
  assert.equal(resolveLayerShortcut({ key: '[', code: 'BracketRight', altKey: false }), 'sendToBack');
});

test('resolveLayerShortcut: fallback por e.code quando e.key não é colchete (ex.: ABNT gera º/ª)', () => {
  assert.equal(resolveLayerShortcut({ key: 'º', code: 'BracketRight', altKey: false }), 'bringToFront');
  assert.equal(resolveLayerShortcut({ key: 'ª', code: 'BracketLeft', altKey: false }), 'sendToBack');
  // e.key 'Unidentified' também é coberto pelo fallback
  assert.equal(resolveLayerShortcut({ key: 'Unidentified', code: 'BracketRight', altKey: false }), 'bringToFront');
});

test('resolveLayerShortcut: teclas não relacionadas e AltGr retornam null', () => {
  assert.equal(resolveLayerShortcut({ key: 'a', code: 'KeyA', altKey: false }), null);
  assert.equal(resolveLayerShortcut({ key: 'Enter', code: 'Enter', altKey: false }), null);
  // AltGr no ABNT2: altKey ativo não deve disparar reordenação
  assert.equal(resolveLayerShortcut({ key: ']', code: 'BracketRight', altKey: true }), null);
});

test('bloco contíguo de seleção avança como unidade (ordem interna preservada)', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3), el('d', 4), el('e', 5)];
  const updates = computeLayerReorderUpdates(elements, ['a', 'b'], 'bringForward');
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  assert.deepEqual(sorted, ['c', 'a', 'b', 'd', 'e']);
});

test('seleção que já está no topo/fundo não gera updates inválidos', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3)];
  assert.deepEqual(computeLayerReorderUpdates(elements, ['c'], 'bringForward'), []);
  assert.deepEqual(computeLayerReorderUpdates(elements, ['a'], 'sendBackward'), []);
});

test('pilha renormalizada fica densa após buracos de deleção', () => {
  // 5 elementos, 3 deletados — buracos de zIndex permanecem
  const elements = [el('a', 1), el('b', 4), el('c', 5)];
  const updates = computeLayerReorderUpdates(elements, ['a'], 'bringToFront');
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const zs = sortElementsByLayer(applied).map((e) => e.zIndex);
  assert.deepEqual(zs, [1, 2, 3]);
});

test('moveBlockInLayerOrder move bloco preservando ordem interna (drag do painel)', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3), el('d', 4)];
  // Arrastar o bloco [c, d] para antes de 'b'
  const updates = moveBlockInLayerOrder(elements, ['c', 'd'], 'b', 'before');
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  assert.deepEqual(sorted, ['a', 'c', 'd', 'b']);
});

test('moveBlockInLayerOrder com target null after = topo da pilha', () => {
  const elements = [el('a', 1), el('b', 2), el('c', 3)];
  const updates = moveBlockInLayerOrder(elements, ['a'], null, 'after');
  const applied = elements.map((e) => {
    const u = updates.find((up) => up.id === e.id);
    return u ? { ...e, zIndex: u.updates.zIndex } : e;
  });
  const sorted = sortElementsByLayer(applied).map((e) => e.id);
  assert.deepEqual(sorted, ['b', 'c', 'a']);
});

test('getLayerLabel gera rótulos automáticos legíveis', () => {
  assert.equal(getLayerLabel({ type: 'sticky', text: 'Ideia incrível demais' }), 'Sticky "Ideia incrível dem…"');
  assert.equal(getLayerLabel({ type: 'sticky', text: '' }), 'Sticky');
  assert.equal(getLayerLabel({ type: 'frame', text: 'Área de Sprint' }), 'Moldura "Área de Sprint"');
  assert.equal(getLayerLabel({ type: 'rect', text: 'x' }), 'Forma');
  assert.equal(getLayerLabel({ type: 'gif', alt: 'Gatinho' }), 'GIF "Gatinho"');
  assert.equal(getLayerLabel({ type: 'pen', text: '' }), 'Traço');
});
