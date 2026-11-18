import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isElementContainedInFrame } from '../src/utils/frameContainment.ts';
import { boundsIntersect, getElementWorldBounds } from '../src/utils/elementBounds.ts';

test('WhiteboardCanvas: importa isElementContainedInFrame para isolamento de arrasto', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf-8');

  assert.match(
    canvasSrc,
    /isElementContainedInFrame/,
    'WhiteboardCanvas deve importar isElementContainedInFrame'
  );
});

test('WhiteboardCanvas: clique simples em elemento com multisseleção ativa reduz a seleção para apenas ele', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf-8');

  assert.match(
    canvasSrc,
    /!selectedIds\.includes\(elemId\)\s*\|\|\s*selectedIds\.length\s*>\s*1/,
    'handleItemSelect deve isolar a seleção no elemento clicado quando havia multisseleção'
  );
});

test('WhiteboardCanvas: marquee selection ignora moldura de fundo se houver elementos filhos atingidos', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf-8');

  assert.match(
    canvasSrc,
    /nonFrameHits\.length\s*>\s*0/,
    'Marquee selection deve verificar se há nonFrameHits'
  );
  assert.match(
    canvasSrc,
    /completelyEncloses/,
    'Marquee selection só deve incluir a moldura se a caixa de seleção envolver toda a moldura'
  );
});

test('WhiteboardCanvas: onDragStart isola seleção e exclui moldura pai ao arrastar elemento contido', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(
    canvasSrc.includes('if (!selectedIds.includes(targetId))'),
    'onDragStart deve verificar se targetId já estava selecionado'
  );
  assert.ok(
    canvasSrc.includes('onSelectionChange([targetId])'),
    'onDragStart deve atualizar a seleção para o elemento arrastado se ele não estava selecionado'
  );

  assert.match(
    canvasSrc,
    /isElementContainedInFrame\(targetElem,\s*el\)/,
    'onDragStart deve filtrar molduras que contenham targetElem para não movê-las'
  );
});

test('WhiteboardCanvas: handleElementChange não move a moldura pai ao atualizar elemento contido', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf-8');

  assert.match(
    canvasSrc,
    /isElementContainedInFrame\(originElem,\s*el\)/,
    'handleElementChange deve filtrar molduras que contenham originElem'
  );
});

test('Lógica geométrica: simulação de Marquee e Drag Isolation em template com Moldura e elementos sobrepostos', () => {
  const parentFrame = {
    id: 'parent_frame_funnel',
    type: 'frame',
    x: 100,
    y: 100,
    width: 1200,
    height: 700,
    zIndex: 1,
  };

  const funnelStep1 = {
    id: 'funnel_step_1',
    type: 'rect',
    x: 140,
    y: 140,
    width: 440,
    height: 64,
    zIndex: 2,
  };

  const funnelStep2 = {
    id: 'funnel_step_2',
    type: 'rect',
    x: 180,
    y: 240,
    width: 360,
    height: 64,
    zIndex: 3,
  };

  const allElements = [parentFrame, funnelStep1, funnelStep2];

  // 1. isElementContainedInFrame confirma que funnelStep1 e funnelStep2 estão dentro da moldura pai
  assert.equal(isElementContainedInFrame(funnelStep1, parentFrame), true);
  assert.equal(isElementContainedInFrame(funnelStep2, parentFrame), true);

  // 2. Simulação de Marquee box arrastada apenas sobre funnelStep1
  const marqueeBox = {
    x: 130,
    y: 130,
    w: 460,
    h: 80,
  };

  // Ambos intersectam geometricamente a caixa marquee
  const rawHits = allElements.filter((el) => boundsIntersect(getElementWorldBounds(el), marqueeBox));
  assert.equal(rawHits.length, 2, 'Brutamente, tanto a moldura pai quanto o rect colidem com a caixa');

  // Com o filtro inteligente de Miro/Figma:
  const nonFrameHits = rawHits.filter((el) => el.type !== 'frame');
  assert.equal(nonFrameHits.length, 1);
  assert.equal(nonFrameHits[0].id, 'funnel_step_1');

  const filteredHits = rawHits.filter((el) => {
    if (el.type !== 'frame') return true;
    const b = getElementWorldBounds(el);
    const completelyEncloses =
      marqueeBox.x <= b.x &&
      marqueeBox.y <= b.y &&
      marqueeBox.x + marqueeBox.w >= b.x + b.w &&
      marqueeBox.y + marqueeBox.h >= b.y + b.h;
    return completelyEncloses;
  });

  assert.deepEqual(
    filteredHits.map((el) => el.id),
    ['funnel_step_1'],
    'Marquee inteligente deve selecionar APENAS funnel_step_1, ignorando a moldura pai embaixo!'
  );

  // 3. Simulação de Drag Isolation se por qualquer motivo parent_frame estivesse em selectedIds
  const selectedIds = ['parent_frame_funnel', 'funnel_step_1'];
  const targetId = 'funnel_step_1';
  const targetElem = funnelStep1;

  const effectiveSelectedIds = selectedIds.filter((id) => {
    if (id === targetId) return true;
    const el = allElements.find((e) => e.id === id);
    if (el && el.type === 'frame' && isElementContainedInFrame(targetElem, el)) {
      return false;
    }
    return true;
  });

  assert.deepEqual(
    effectiveSelectedIds,
    ['funnel_step_1'],
    'Ao arrastar o elemento filho, a moldura pai embaixo é descartada da lista de arraste'
  );
});
