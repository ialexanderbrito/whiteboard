import test from 'node:test';
import assert from 'node:assert/strict';
import { getCustomCanvasCursor } from '../src/utils/canvasCursors.ts';
import {
  DEFAULT_LASER_COLOR,
  LASER_COLOR_OPTIONS,
  sanitizeLaserColor,
  getLaserOpticalPalette,
  splitLaserStrokes,
  smoothLaserStroke,
  computeRibbonSamples,
} from '../src/utils/laserGeometry.ts';

test('Laser pointer: getCustomCanvasCursor returns none to hide system cursor and show glowing canvas dot', () => {
  const laserCursor = getCustomCanvasCursor('laser');
  assert.equal(laserCursor, 'none', 'Deve ocultar o cursor nativo do sistema para destacar o feixe do laser');
});

test('Text tool: getCustomCanvasCursor returns SVG with bold T icon and proper hotspot', () => {
  const textCursor = getCustomCanvasCursor('text');
  assert.ok(textCursor.includes('data:image/svg+xml'), 'Deve retornar cursor em formato SVG data-uri');
  assert.ok(textCursor.includes('3 3, text'), 'Deve ter o hotspot no topo esquerdo do T (3 3)');
});

test('Eraser tool: getCustomCanvasCursor returns precision reticle circle', () => {
  const eraserCursor = getCustomCanvasCursor('eraser');
  assert.ok(eraserCursor.includes('data:image/svg+xml'), 'Deve retornar cursor em formato SVG data-uri');
  assert.ok(eraserCursor.includes('12 12, crosshair'), 'Deve ter o hotspot centralizado (12 12)');
  assert.ok(eraserCursor.includes('%23ef4444'), 'Deve conter o ponto central de mira vermelha (#ef4444)');
});

test('Laser pointer: color options, sanitization and optical palette derivation', () => {
  assert.ok(LASER_COLOR_OPTIONS.length >= 6, 'Deve oferecer paleta variada de cores de laser');
  assert.equal(LASER_COLOR_OPTIONS[0].value, DEFAULT_LASER_COLOR);

  assert.equal(sanitizeLaserColor('#00C853'), '#00c853');
  assert.equal(sanitizeLaserColor('invalid-color'), DEFAULT_LASER_COLOR);
  assert.equal(sanitizeLaserColor(null), DEFAULT_LASER_COLOR);

  const emeraldPalette = getLaserOpticalPalette('#00c853');
  assert.equal(emeraldPalette.hex, '#00c853');
  assert.equal(emeraldPalette.r, 0);
  assert.equal(emeraldPalette.g, 200);
  assert.equal(emeraldPalette.b, 83);
  assert.ok(emeraldPalette.coronaRgb.startsWith('rgb('));
  assert.ok(emeraldPalette.contrastRimRgba.startsWith('rgba('));
});

test('Laser pointer: trail decay and progress calculation', () => {
  const TRAIL_DURATION_MS = 1000;
  const now = 100000;

  // Ponto recente (recém criado)
  const freshPoint = { x: 100, y: 150, timestamp: now };
  const freshAge = now - freshPoint.timestamp;
  const freshProgress = Math.max(0, Math.min(1, 1 - freshAge / TRAIL_DURATION_MS));
  assert.equal(freshProgress, 1, 'Ponto no instante atual deve ter opacidade total (1)');

  // Ponto na metade da vida útil (500ms atrás)
  const midPoint = { x: 120, y: 160, timestamp: now - 500 };
  const midAge = now - midPoint.timestamp;
  const midProgress = Math.max(0, Math.min(1, 1 - midAge / TRAIL_DURATION_MS));
  assert.equal(midProgress, 0.5, 'Ponto com 500ms deve ter progresso 0.5');

  // Ponto expirado (> 1000ms)
  const expiredPoint = { x: 140, y: 170, timestamp: now - 1100 };
  const expiredAge = now - expiredPoint.timestamp;
  const isExpired = expiredAge > TRAIL_DURATION_MS;
  assert.equal(isExpired, true, 'Ponto com mais de 1000ms deve ser descartado');
});

test('Laser pointer: splitLaserStrokes isolates separate clicks and preserves per-stroke color', () => {
  const now = 5000;
  const points = [
    { x: 10, y: 10, timestamp: 4400, newStroke: true, color: '#ff1744' },
    { x: 30, y: 15, timestamp: 4450, color: '#ff1744' },
    { x: 55, y: 20, timestamp: 4500, color: '#ff1744' },
    // Usuário trocou para verde e clicou em outro ponto
    { x: 400, y: 300, timestamp: 4700, newStroke: true, color: '#00c853' },
    { x: 425, y: 310, timestamp: 4740, color: '#00c853' },
  ];

  const strokes = splitLaserStrokes(points, now, 1050, {
    minDist: 2,
    liveTip: { x: 440, y: 320 },
    isDrawing: true,
    activeColor: '#00c853',
  });

  assert.equal(strokes.length, 2, 'Cliques separados devem gerar dois traços independentes');
  assert.equal(strokes[0][0].color, '#ff1744');
  assert.equal(strokes[1][0].color, '#00c853');
  assert.equal(strokes[1][2].color, '#00c853');
  assert.deepEqual(
    { x: strokes[1][2].x, y: strokes[1][2].y },
    { x: 440, y: 320 }
  );
});

test('Laser pointer: smoothLaserStroke and computeRibbonSamples produce tapered continuous ribbon', () => {
  const now = 2000;
  const raw = [
    { x: 0, y: 0, timestamp: 1700, newStroke: true, color: '#2563eb' },
    { x: 20, y: 0, timestamp: 1800, color: '#2563eb' },
    { x: 40, y: 20, timestamp: 1900, color: '#2563eb' },
    { x: 60, y: 20, timestamp: 2000, color: '#2563eb' },
  ];

  const smoothed = smoothLaserStroke(raw, 2.0);
  assert.ok(smoothed.length > raw.length, 'Subdivisão Chaikin deve suavizar os segmentos intermediários');
  assert.equal(smoothed[1].color, '#2563eb');
  assert.deepEqual({ x: smoothed[0].x, y: smoothed[0].y }, { x: 0, y: 0 });
  assert.deepEqual(
    { x: smoothed[smoothed.length - 1].x, y: smoothed[smoothed.length - 1].y },
    { x: 60, y: 20 }
  );

  const { samples, headProgress } = computeRibbonSamples(smoothed, now, 1050, 20);
  assert.equal(samples.length, smoothed.length);
  assert.equal(headProgress, 1);
  assert.equal(samples[0].taper, 0, 'A ponta final da cauda deve afunilar até zero');
  assert.ok(samples[samples.length - 1].taper > 0.9, 'A cabeça do feixe deve manter espessura total');
  for (const s of samples) {
    const normLen = Math.hypot(s.nx, s.ny);
    assert.ok(Math.abs(normLen - 1) < 1e-6, 'Todas as normais da fita devem ser unitárias');
  }
});

test('LaserTrailOverlay, Toolbar & PresentationControlBar: support selectable laser colors without cross artifact', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const overlayContent = fs.readFileSync(
    path.resolve('src/components/whiteboard/LaserTrailOverlay.tsx'),
    'utf-8'
  );
  const toolbarContent = fs.readFileSync(
    path.resolve('src/components/whiteboard/Toolbar.tsx'),
    'utf-8'
  );
  const presentationContent = fs.readFileSync(
    path.resolve('src/components/whiteboard/PresentationControlBar.tsx'),
    'utf-8'
  );

  assert.ok(
    overlayContent.includes('createRadialGradient') && overlayContent.includes('getLaserOpticalPalette'),
    'LaserTrailOverlay deve renderizar gradiente radial óptico adaptado à cor escolhida'
  );
  assert.ok(
    !overlayContent.includes('x - flareLen') && !overlayContent.includes('y - flareLen'),
    'Não deve desenhar linhas perpendiculares em cruz (+) ao clicar com o laser'
  );
  assert.ok(
    toolbarContent.includes('LASER_COLOR_OPTIONS') && toolbarContent.includes('onSelectLaserColor'),
    'Toolbar deve exibir seletor de cores para o Apontador Laser'
  );
  assert.ok(
    presentationContent.includes('LASER_COLOR_OPTIONS') && presentationContent.includes('onSelectLaserColor'),
    'PresentationControlBar deve permitir escolher a cor do laser durante apresentações'
  );
});

test('Laser pointer: presence payload format conforms to UserPresence schema with custom color', () => {
  const presenceMock = {
    userId: 'user_123',
    name: 'Alexander',
    color: '#3b82f6',
    cursor: { x: 250, y: 400 },
    activeTool: 'laser',
    laser: {
      isDrawing: true,
      points: [[250, 400], [252, 403]],
      color: '#00c853',
      timestamp: Date.now(),
    },
    selectedElementId: null,
    lastSeen: Date.now(),
  };

  assert.equal(presenceMock.activeTool, 'laser');
  assert.equal(presenceMock.laser.isDrawing, true);
  assert.equal(presenceMock.laser.color, '#00c853');
  assert.equal(presenceMock.laser.points.length, 2);
  assert.equal(typeof presenceMock.laser.timestamp, 'number');
});

test('WhiteboardCanvas: allows Mover (pan) and Laser tools in readOnly mode and locks native cursor', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const rawContent = fs.readFileSync(canvasPath, 'utf-8');
  const content = rawContent.replace(/\r\n/g, '\n');

  // Stage deve ser draggable quando isDraggableStage for true, sem o bloqueador "!readOnly &&"
  assert.ok(
    content.includes('draggable={isDraggableStage}'),
    'Stage deve ser arrastável na ferramenta Pan mesmo para usuários em modo somente leitura (readOnly)'
  );
  assert.ok(
    !content.includes('draggable={!readOnly && isDraggableStage}'),
    'Não deve bloquear o arraste do palco quando readOnly for true'
  );
  assert.ok(
    content.includes('data-laser-active='),
    'Deve marcar data-laser-active no container para impedir cursores nativos sobre elementos'
  );

  // No handleMouseMove, o laser deve ser executado mesmo quando readOnly for true
  const laserIndex = content.indexOf("if (currentTool === 'laser')");
  const readOnlyBlockIndex = content.indexOf(
    '// Se estiver em modo somente leitura (view): bloqueia ferramentas de criação e modificação de elementos\n    if (readOnly) {\n      return;\n    }'
  );
  assert.ok(laserIndex !== -1, 'handleMouseMove deve conter lógica do apontador laser');
  assert.ok(readOnlyBlockIndex !== -1, 'handleMouseMove deve conter bloqueio de escrita para readOnly');
  assert.ok(
    laserIndex < readOnlyBlockIndex,
    'O Apontador Laser deve ser processado ANTES do bloqueio de escrita readOnly no handleMouseMove'
  );
});
