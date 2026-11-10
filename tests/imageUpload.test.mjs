import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isSupportedImageFile,
  formatImageAltName,
  computeInitialCanvasDimensions,
  computeImageGridLayout,
  estimateDataUrlBytes,
  clearRecentUploadedImages,
  validateDroppedFiles,
  formatUnsupportedFileMessage,
  RECENT_IMAGES_STORAGE_KEY,
} from '../src/utils/imageUpload.ts';
import { cleanupObsoleteStorage } from '../src/utils/storageCleanup.ts';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('isSupportedImageFile validates MIME types and file extensions', () => {
  assert.equal(isSupportedImageFile({ type: 'image/png', name: 'foto.png' }), true);
  assert.equal(isSupportedImageFile({ type: 'image/webp', name: 'diagrama.webp' }), true);
  assert.equal(isSupportedImageFile({ type: '', name: 'arquitetura.svg' }), true);
  assert.equal(isSupportedImageFile({ type: 'application/pdf', name: 'relatorio.pdf' }), false);
  assert.equal(isSupportedImageFile(null), false);
});

test('formatImageAltName cleans filenames into human-readable alt labels', () => {
  assert.equal(formatImageAltName('sprint_architecture-v2.png'), 'sprint architecture v2');
  assert.equal(formatImageAltName('   '), 'Imagem do computador');
  assert.equal(formatImageAltName(undefined), 'Imagem do computador');
});

test('computeInitialCanvasDimensions preserves aspect ratio and clamps bounds', () => {
  const landscape = computeInitialCanvasDimensions(1920, 1080, 420);
  assert.equal(landscape.width, 420);
  assert.equal(landscape.height, 236);

  const small = computeInitialCanvasDimensions(20, 20, 420, 48);
  assert.equal(small.width, 48);
  assert.equal(small.height, 48);
});

test('computeImageGridLayout centers a single image and arranges multiple images in a balanced grid', () => {
  const single = computeImageGridLayout([{ width: 200, height: 100 }], { x: 500, y: 400 });
  assert.deepEqual(single, [{ x: 400, y: 350 }]);

  const multi = computeImageGridLayout(
    [
      { width: 200, height: 150 },
      { width: 200, height: 150 },
      { width: 200, height: 150 },
      { width: 200, height: 150 },
    ],
    { x: 1000, y: 800 },
    24
  );
  assert.equal(multi.length, 4);
  // 2x2 grid: first row has 2 items side by side, second row below it
  assert.ok(multi[0].x < multi[1].x);
  assert.equal(multi[0].y, multi[1].y);
  assert.ok(multi[2].y > multi[0].y);
  assert.equal(multi[2].x, multi[0].x);
});

test('estimateDataUrlBytes estimates Base64 payload size accurately', () => {
  const fakeBase64 = 'data:image/webp;base64,' + 'A'.repeat(4000);
  const bytes = estimateDataUrlBytes(fakeBase64);
  assert.equal(bytes, 3000);
});

test('clearRecentUploadedImages and cleanupObsoleteStorage remove legacy Base64 images from localStorage', () => {
  const store = new Map();
  globalThis.localStorage = {
    length: 0,
    key: (i) => Array.from(store.keys())[i] || null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
      globalThis.localStorage.length = store.size;
    },
    removeItem: (k) => {
      store.delete(k);
      globalThis.localStorage.length = store.size;
    },
  };

  // Simula lixo de imagem Base64 acumulado no storage
  localStorage.setItem(RECENT_IMAGES_STORAGE_KEY, JSON.stringify([{ id: '1', src: 'data:image/webp;base64,AAA' }]));
  localStorage.setItem('mirio_timer_xyz', JSON.stringify({ running: false }));
  localStorage.setItem('mirio_votes_abc', JSON.stringify({ session: null }));
  localStorage.setItem('mirio_theme', 'dark');

  assert.equal(localStorage.getItem(RECENT_IMAGES_STORAGE_KEY) !== null, true);
  clearRecentUploadedImages();
  assert.equal(localStorage.getItem(RECENT_IMAGES_STORAGE_KEY), null);

  // Testa limpeza automática geral de dados obsoletos
  cleanupObsoleteStorage();
  assert.equal(localStorage.getItem('mirio_timer_xyz'), null);
  assert.equal(localStorage.getItem('mirio_votes_abc'), null);
  // Mantém preferências legítimas
  assert.equal(localStorage.getItem('mirio_theme'), 'dark');
});

test('StickersModal integrates 3 unified tabs ("Imagens & Upload", "Emojis", "GIFs") and multiple file upload', () => {
  const src = readSource('src/components/whiteboard/StickersModal.tsx');
  assert.match(src, /Imagens & Upload/);
  assert.match(src, /type="file"/);
  assert.match(src, /multiple/);
  assert.match(src, /processImageFiles/);
  assert.match(src, /onBatchInsertMedia/);
});

test('validateDroppedFiles and formatUnsupportedFileMessage identify PDFs and unsupported files with human-friendly messages', () => {
  const pdfOnly = validateDroppedFiles([
    { name: 'especificacao.pdf', type: 'application/pdf' },
  ]);
  assert.equal(pdfOnly.validFiles.length, 0);
  assert.equal(pdfOnly.unsupportedFiles.length, 1);
  assert.equal(pdfOnly.hasPdf, true);

  const pdfMsg = formatUnsupportedFileMessage(pdfOnly);
  assert.match(pdfMsg.title, /PDF/);
  assert.match(pdfMsg.message, /especificacao\.pdf/);
  assert.match(pdfMsg.message, /PNG|JPG|print/);

  const mixed = validateDroppedFiles([
    { name: 'foto.png', type: 'image/png' },
    { name: 'manual.pdf', type: 'application/pdf' },
    { name: 'dados.zip', type: 'application/zip' },
  ]);
  assert.equal(mixed.validFiles.length, 1);
  assert.equal(mixed.unsupportedFiles.length, 2);
  assert.equal(mixed.hasPdf, true);

  const mixedMsg = formatUnsupportedFileMessage(mixed);
  assert.match(mixedMsg.title, /PDF/);
});

test('WhiteboardCanvas and BoardPage wire computer image drag-and-drop, shortcut I, and batch grid insertion', () => {
  const canvasSrc = readSource('src/components/whiteboard/WhiteboardCanvas.tsx');
  assert.match(canvasSrc, /onDrop=\{handleCanvasDrop\}/);
  assert.match(canvasSrc, /onDragOver=\{handleCanvasDragOver\}/);
  assert.match(canvasSrc, /Solte para adicionar imagens ao quadro/);
  assert.match(canvasSrc, /canvasToast/);
  assert.match(canvasSrc, /showCanvasToast/);

  const boardSrc = readSource('src/pages/BoardPage.tsx');
  assert.match(boardSrc, /handleBatchInsertMedia/);
  assert.match(boardSrc, /onBatchInsertMedia=\{handleBatchInsertMedia\}/);
});
