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
  getRecentUploadedImages,
  saveRecentUploadedImages,
  removeRecentUploadedImage,
  clearRecentUploadedImages,
  validateDroppedFiles,
  formatUnsupportedFileMessage,
  MAX_RECENT_IMAGES,
} from '../src/utils/imageUpload.ts';

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

test('Recent uploaded images storage persists, deduplicates, removes, and clears items in localStorage', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  clearRecentUploadedImages();
  assert.deepEqual(getRecentUploadedImages(), []);

  const afterSave = saveRecentUploadedImages([
    { type: 'sticker', src: 'data:image/webp;base64,AAA', alt: 'Print 1', width: 300, height: 200 },
    { type: 'gif', src: 'data:image/gif;base64,BBB', alt: 'Anim 2', width: 220, height: 160 },
  ]);
  assert.equal(afterSave.length, 2);
  assert.equal(afterSave[0].alt, 'Print 1');

  // Deduplicates identical src
  const afterDup = saveRecentUploadedImages([
    { type: 'sticker', src: 'data:image/webp;base64,AAA', alt: 'Print 1 Atualizado', width: 300, height: 200 },
  ]);
  assert.equal(afterDup.length, 2);
  assert.equal(afterDup[0].alt, 'Print 1 Atualizado');

  // Respects MAX_RECENT_IMAGES cap
  const many = Array.from({ length: 12 }, (_, i) => ({
    type: 'sticker',
    src: `data:image/webp;base64,IMG_${i}`,
    alt: `Img ${i}`,
    width: 200,
    height: 150,
  }));
  const capped = saveRecentUploadedImages(many);
  assert.equal(capped.length, MAX_RECENT_IMAGES);

  // Removes single item
  const afterRemove = removeRecentUploadedImage(capped[0].id);
  assert.equal(afterRemove.length, MAX_RECENT_IMAGES - 1);

  clearRecentUploadedImages();
  assert.deepEqual(getRecentUploadedImages(), []);
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
