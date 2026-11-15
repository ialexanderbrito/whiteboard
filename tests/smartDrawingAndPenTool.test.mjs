import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Toolbar: Pen tooltip is named "Desenho Livre" without "Miro"', () => {
  const src = readSource('src/components/whiteboard/Toolbar.tsx');
  assert.match(src, /Desenho Livre\s*<span/);
  assert.doesNotMatch(src, /Desenho Livre Miro/);
});

test('Toolbar: Renders "Desenho Inteligente" with accessible switch and Emil Kowalski craft', () => {
  const src = readSource('src/components/whiteboard/Toolbar.tsx');
  // Substituição de "Smart Drawing" por "Desenho Inteligente"
  assert.match(src, /Desenho Inteligente/);
  assert.doesNotMatch(src, /<span>Smart Drawing<\/span>/);
  // Switch acessível e micro-interação tátil
  assert.match(src, /role="switch"/);
  assert.match(src, /aria-checked=\{smartDrawing\}/);
  assert.match(src, /active:scale-\[0\.97\]/);
  assert.match(src, /⇧P/);
  // Indicador de status no tooltip da caneta
  assert.match(src, /Desenho Inteligente ativo/);
});

test('CommandPalette: supports smartDrawing toggle in boardContext and includes Shift+P shortcut', () => {
  const src = readSource('src/components/command/CommandPalette.tsx');
  assert.match(src, /smartDrawing\?: boolean;/);
  assert.match(src, /onToggleSmartDrawing\?: \(enabled\?: boolean\) => void;/);
  assert.match(src, /boardContext\.onToggleSmartDrawing/);
  assert.match(src, /Desativar Desenho Inteligente/);
  assert.match(src, /Ativar Desenho Inteligente/);
  assert.match(src, /Shift\+P/);
});

test('KeyboardShortcutsModal: registers Shift + P shortcut for Desenho Inteligente', () => {
  const src = readSource('src/components/whiteboard/KeyboardShortcutsModal.tsx');
  assert.match(src, /keys:\s*\['Shift',\s*'P'\]/);
  assert.match(src, /description:\s*'Alternar Desenho Inteligente/);
});

test('WhiteboardCanvas: handles Shift+P shortcut with toast feedback and triggers onToggleSmartDrawing', () => {
  const src = readSource('src/components/whiteboard/WhiteboardCanvas.tsx');
  assert.match(src, /onToggleSmartDrawing\?: \(\) => void;/);
  assert.match(src, /e\.shiftKey\s*&&\s*\(e\.key === 'P' \|\| e\.key === 'p'\)/);
  assert.match(src, /onToggleSmartDrawing\?\.\(\)/);
  assert.match(src, /showCanvasToast\(\s*nextState\s*\?\s*'Desenho Inteligente: Ativado'\s*:\s*'Desenho Inteligente: Desativado'/);
});

test('BoardPage: persists smartDrawing in localStorage and wires handleToggleSmartDrawing', () => {
  const src = readSource('src/pages/BoardPage.tsx');
  assert.match(src, /localStorage\.getItem\('mirio_smart_drawing_enabled'\)/);
  assert.match(src, /localStorage\.setItem\('mirio_smart_drawing_enabled'/);
  assert.match(src, /handleToggleSmartDrawing/);
  assert.match(src, /smartDrawing(?:,\s*|:\s*smartDrawing)/);
  assert.match(src, /onToggleSmartDrawing:\s*handleToggleSmartDrawing/);
});

test('recognizeSmartShape: accurately detects square with rounded corners and bowed edges as rect, NEVER circle', async () => {
  const { recognizeSmartShape } = await import('../src/utils/smartDrawing.ts');

  // 1. Quadrado à mão com cantos arredondados e leve curvatura (o caso reportado pelo usuário)
  const bowedSquare = [];
  const minX = 100, maxX = 250, minY = 100, maxY = 250;
  const f = 15, bow = 8;
  // topo
  for (let t = 0; t <= 1; t += 0.05) {
    bowedSquare.push(Math.round((minX + f) + t * (maxX - minX - 2*f)), Math.round(minY + Math.sin(t * Math.PI) * bow));
  }
  // canto superior direito
  for (let a = -Math.PI/2; a <= 0; a += 0.3) {
    bowedSquare.push(Math.round(maxX - f + f * Math.cos(a)), Math.round(minY + f + f * Math.sin(a)));
  }
  // borda direita
  for (let t = 0; t <= 1; t += 0.05) {
    bowedSquare.push(Math.round(maxX + Math.sin(t * Math.PI) * bow), Math.round((minY + f) + t * (maxY - minY - 2*f)));
  }
  // canto inferior direito
  for (let a = 0; a <= Math.PI/2; a += 0.3) {
    bowedSquare.push(Math.round(maxX - f + f * Math.cos(a)), Math.round(maxY - f + f * Math.sin(a)));
  }
  // borda inferior
  for (let t = 0; t <= 1; t += 0.05) {
    bowedSquare.push(Math.round((maxX - f) - t * (maxX - minX - 2*f)), Math.round(maxY - Math.sin(t * Math.PI) * bow));
  }
  // canto inferior esquerdo
  for (let a = Math.PI/2; a <= Math.PI; a += 0.3) {
    bowedSquare.push(Math.round(minX + f + f * Math.cos(a)), Math.round(maxY - f + f * Math.sin(a)));
  }
  // borda esquerda
  for (let t = 0; t <= 1; t += 0.05) {
    bowedSquare.push(Math.round(minX - Math.sin(t * Math.PI) * bow), Math.round((maxY - f) - t * (maxY - minY - 2*f)));
  }
  // canto superior esquerdo
  for (let a = Math.PI; a <= 3*Math.PI/2; a += 0.3) {
    bowedSquare.push(Math.round(minX + f + f * Math.cos(a)), Math.round(minY + f + f * Math.sin(a)));
  }
  bowedSquare.push(Math.round(minX + f), Math.round(minY));

  const resBowed = recognizeSmartShape(bowedSquare);
  assert.equal(resBowed.type, 'rect', 'Quadrado com cantos arredondados e bordas abauladas DEVE virar rect, não circle');

  // 2. Círculo autêntico desenhado à mão com tremor
  const handCircle = [];
  for (let a = 0; a <= Math.PI * 2; a += 0.1) {
    const jitter = Math.sin(a * 4) * 2;
    handCircle.push(Math.round(150 + (50 + jitter) * Math.cos(a)), Math.round(150 + (50 + jitter) * Math.sin(a)));
  }
  const resCircle = recognizeSmartShape(handCircle);
  assert.equal(resCircle.type, 'circle', 'Círculo autêntico DEVE ser reconhecido como circle');

  // 3. Triângulo
  const tri = [];
  for (let t = 0; t <= 1; t += 0.1) tri.push(Math.round(150 + t * 50), Math.round(100 + t * 100));
  for (let t = 0; t <= 1; t += 0.1) tri.push(Math.round(200 - t * 100), 200);
  for (let t = 0; t <= 1; t += 0.1) tri.push(Math.round(100 + t * 50), Math.round(200 - t * 100));
  const resTri = recognizeSmartShape(tri);
  assert.equal(resTri.type, 'triangle', 'Triângulo DEVE ser reconhecido como triangle');

  // 4. Retângulo largo (proporção 3:1)
  const wideRect = [];
  for (let x = 50; x <= 350; x += 10) wideRect.push(x, 100);
  for (let y = 100; y <= 200; y += 10) wideRect.push(350, y);
  for (let x = 350; x >= 50; x -= 10) wideRect.push(x, 200);
  for (let y = 200; y >= 100; y -= 10) wideRect.push(50, y);
  const resWide = recognizeSmartShape(wideRect);
  assert.equal(resWide.type, 'rect', 'Retângulo largo DEVE ser reconhecido como rect');
});
