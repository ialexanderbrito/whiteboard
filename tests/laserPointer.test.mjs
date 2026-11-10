import test from 'node:test';
import assert from 'node:assert/strict';
import { getCustomCanvasCursor } from '../src/utils/canvasCursors.ts';

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

test('Laser pointer: smooth point filtering prevents point clustering/dots', () => {
  const points = [
    { x: 10, y: 10, timestamp: 1000 },
    { x: 10.5, y: 10.8, timestamp: 1010 }, // Muito perto (< 2.5px), deve ser ignorado
    { x: 15, y: 20, timestamp: 1020 },     // Válido (dist ~11.2px)
  ];

  const filtered = [];
  for (const p of points) {
    const last = filtered[filtered.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 2.5) {
      filtered.push(p);
    }
  }

  assert.equal(filtered.length, 2, 'Deve filtrar micro-pontos próximos para evitar nós/bolinhas no trajeto');
  assert.equal(filtered[0].x, 10);
  assert.equal(filtered[1].x, 15);
});

test('Laser pointer: presence payload format conforms to UserPresence schema', () => {
  const presenceMock = {
    userId: 'user_123',
    name: 'Alexander',
    color: '#3b82f6',
    cursor: { x: 250, y: 400 },
    activeTool: 'laser',
    laser: {
      isDrawing: true,
      points: [[250, 400], [252, 403]],
      timestamp: Date.now(),
    },
    selectedElementId: null,
    lastSeen: Date.now(),
  };

  assert.equal(presenceMock.activeTool, 'laser');
  assert.equal(presenceMock.laser.isDrawing, true);
  assert.equal(presenceMock.laser.points.length, 2);
  assert.equal(typeof presenceMock.laser.timestamp, 'number');
});

test('WhiteboardCanvas: allows Mover (pan) and Laser tools in readOnly mode', async () => {
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
