import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
  SPRINT_TEMPLATES, 
  generateTemplateElements 
} from '../src/utils/sprintTemplates.ts';
import { 
  isElementContainedInFrame, 
  getElementsContainedInFrame 
} from '../src/utils/frameContainment.ts';

const mockUser = { uid: 'user_123', displayName: 'Alexander' };

test('generateTemplateElements: gera Moldura Pai envolvendo todas as colunas de template padrão', () => {
  const retroTemplate = SPRINT_TEMPLATES.find((t) => t.id === 'retro_4ls');
  assert.ok(retroTemplate, 'Template retro_4ls deve existir');

  const elements = generateTemplateElements(retroTemplate, { x: 100, y: 100 }, mockUser, 10);
  assert.ok(elements.length > 0, 'Deve gerar elementos');

  // O primeiro elemento DEVE ser a Moldura Pai
  const parentFrame = elements[0];
  assert.equal(parentFrame.type, 'frame', 'Primeiro elemento deve ser uma moldura (frame)');
  assert.equal(parentFrame.text, retroTemplate.title, 'Título da moldura pai deve ser o título do template');
  assert.equal(parentFrame.x, 100, 'Origem X da moldura pai');
  assert.equal(parentFrame.y, 100, 'Origem Y da moldura pai');
  assert.deepEqual(parentFrame.dash, [], 'Moldura pai deve possuir borda contínua discreta');

  // As sub-raias (colunas) devem estar contidas dentro da moldura pai
  const childFrames = elements.filter((el, idx) => idx > 0 && el.type === 'frame');
  assert.equal(childFrames.length, retroTemplate.columns.length, 'Deve haver uma sub-raia para cada coluna');

  for (const child of childFrames) {
    assert.ok(child.x > parentFrame.x, `Sub-raia ${child.text} deve começar após padding esquerdo`);
    assert.ok(child.y > parentFrame.y, `Sub-raia ${child.text} deve começar após padding superior`);
    assert.ok(
      child.x + (child.width || 0) < parentFrame.x + (parentFrame.width || 0),
      `Sub-raia ${child.text} deve terminar antes da borda direita da moldura pai`
    );
    assert.ok(
      child.y + (child.height || 0) < parentFrame.y + (parentFrame.height || 0),
      `Sub-raia ${child.text} deve terminar antes do fundo da moldura pai`
    );
  }
});

test('generateTemplateElements: gera Moldura Pai para templates de gerador customizado (Fluxograma)', () => {
  const flowchartTemplate = SPRINT_TEMPLATES.find((t) => t.id === 'flowchart_architecture');
  assert.ok(flowchartTemplate, 'Template flowchart_architecture deve existir');

  const elements = generateTemplateElements(flowchartTemplate, { x: 200, y: 200 }, mockUser, 1);
  assert.ok(elements.length > 0, 'Deve gerar elementos do fluxograma');

  // O primeiro elemento DEVE ser a Moldura Pai
  const parentFrame = elements[0];
  assert.equal(parentFrame.type, 'frame', 'Primeiro elemento do fluxograma deve ser uma moldura');
  assert.equal(parentFrame.text, flowchartTemplate.title, 'Título deve ser o nome do fluxograma');
  assert.deepEqual(parentFrame.dash, [], 'Borda contínua discreta');

  // Todas as formas e nós internos devem estar dentro da moldura pai
  const innerElements = elements.slice(1);
  assert.ok(innerElements.length >= 4, 'Deve conter nós e setas');

  for (const inner of innerElements) {
    assert.ok(
      inner.x >= parentFrame.x,
      `Elemento ${inner.id || inner.type} x=${inner.x} deve estar dentro da moldura pai x=${parentFrame.x}`
    );
  }
});

test('frameContainment: detecta com precisão a hierarquia e contenção inteligente', () => {
  const parentFrame = {
    id: 'parent_frame_1',
    type: 'frame',
    x: 100,
    y: 100,
    width: 2000,
    height: 900,
    zIndex: 1,
    updatedBy: 'user_1',
    updatedAt: Date.now(),
  };

  const colFrame1 = {
    id: 'col_frame_1',
    type: 'frame',
    x: 140,
    y: 160,
    width: 460,
    height: 700,
    zIndex: 2,
    updatedBy: 'user_1',
    updatedAt: Date.now(),
  };

  const sticky1 = {
    id: 'sticky_1',
    type: 'sticky',
    x: 160,
    y: 210,
    width: 200,
    height: 120,
    zIndex: 3,
    updatedBy: 'user_1',
    updatedAt: Date.now(),
  };

  const externalSticky = {
    id: 'external_sticky',
    type: 'sticky',
    x: 3500,
    y: 3500,
    width: 200,
    height: 120,
    zIndex: 4,
    updatedBy: 'user_1',
    updatedAt: Date.now(),
  };

  const allElements = [parentFrame, colFrame1, sticky1, externalSticky];

  // 1. Moldura Pai contém a coluna e o post-it interno, mas NÃO o post-it externo
  assert.equal(isElementContainedInFrame(colFrame1, parentFrame), true);
  assert.equal(isElementContainedInFrame(sticky1, parentFrame), true);
  assert.equal(isElementContainedInFrame(externalSticky, parentFrame), false);

  const parentContained = getElementsContainedInFrame(parentFrame, allElements);
  assert.deepEqual(parentContained.sort(), ['col_frame_1', 'sticky_1'].sort());

  // 2. Coluna contém apenas o seu próprio post-it (NÃO contém a moldura pai)
  assert.equal(isElementContainedInFrame(sticky1, colFrame1), true);
  assert.equal(isElementContainedInFrame(parentFrame, colFrame1), false);

  const colContained = getElementsContainedInFrame(colFrame1, allElements);
  assert.deepEqual(colContained, ['sticky_1']);
});

test('BoardPage: seleciona apenas a moldura pai ao inserir template para experiência visual limpa', () => {
  const boardPagePath = path.resolve('src/pages/BoardPage.tsx');
  const boardPageSrc = fs.readFileSync(boardPagePath, 'utf-8');

  // Verifica que setSelectedElementIds seleciona withIds[0].id (a moldura pai)
  assert.match(
    boardPageSrc,
    /setSelectedElementIds\(\[withIds\[0\]\.id\]\)/,
    'BoardPage deve selecionar apenas a moldura pai ao inserir template'
  );
});

test('WhiteboardCanvas: possui suporte completo a contenção de molduras durante drag e atualização atômica', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf-8');

  assert.match(canvasSrc, /getElementsContainedInFrame/, 'Canvas deve importar getElementsContainedInFrame');
  assert.match(canvasSrc, /draggedFrameChildIdsRef/, 'Canvas deve rastrear draggedFrameChildIdsRef');
  assert.match(canvasSrc, /hasFrameChildren/, 'Canvas deve processar filhos de moldura no arrasto e commit');
});
