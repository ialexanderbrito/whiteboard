import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createMindMapRootPayload,
  buildMindMapBranchSpec,
  computeMindMapSubtreeUpdates,
} from '../src/utils/mindMap.ts';
import {
  parseRichLinkMetadata,
  tokenizeCodeLine,
} from '../src/utils/richEmbeds.ts';
import {
  createDefaultTableData,
  addTableRow,
  addTableColumn,
  updateTableCell,
  createDefaultKanbanColumns,
  addCardToKanbanColumn,
  moveKanbanCardBetweenColumns,
} from '../src/utils/tableAndKanban.ts';
import {
  clampNormalizedCrop,
  computeAspectPresetCrop,
  toKonvaPixelCrop,
} from '../src/utils/imageCrop.ts';
import { buildMultiPagePdfFromJpegs } from '../src/utils/boardExport.ts';
import { buildRichPastedElementPayload } from '../src/hooks/canvas/useRichPasteDetector.ts';

test('mindMap: creates root, spawns connected child/sibling nodes, and balances subtree vertically', () => {
  const rootPayload = createMindMapRootPayload(500, 400, 1, 'u1', 'Alex');
  const root = { ...rootPayload, id: 'mm_root', updatedAt: 1 };

  const b1 = buildMindMapBranchSpec(root, 'child', [root], 2, 'u1', 'Alex');
  const c1 = { ...b1.nodePayload, id: 'mm_c1', updatedAt: 2 };
  const a1 = { ...b1.createConnectorPayload('mm_c1'), id: 'mm_a1', updatedAt: 2 };

  const b2 = buildMindMapBranchSpec(c1, 'sibling', [root, c1, a1], 4, 'u1', 'Alex');
  const c2 = { ...b2.nodePayload, id: 'mm_c2', updatedAt: 3 };
  const a2 = { ...b2.createConnectorPayload('mm_c2'), id: 'mm_a2', updatedAt: 3 };

  assert.equal(c1.mindmapParentId, 'mm_root');
  assert.equal(c2.mindmapParentId, 'mm_root');
  assert.equal(a1.connectorStyle, 'curved');

  const updates = computeMindMapSubtreeUpdates([root, c1, c2, a1, a2], 'mm_root');
  assert.ok(updates.length >= 2);
});

test('richEmbeds & paste detector: unfurls GitHub/YouTube/Figma URLs and fenced code blocks', () => {
  const gh = parseRichLinkMetadata('https://github.com/facebook/react/pull/29000');
  assert.equal(gh?.provider, 'github');
  assert.match(gh?.title || '', /PR #29000/);

  const yt = parseRichLinkMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(yt?.provider, 'youtube');
  assert.equal(yt?.thumbUrl, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');

  const figma = parseRichLinkMetadata('https://www.figma.com/design/abc123/Mirio-Design-System');
  assert.equal(figma?.provider, 'figma');
  assert.match(figma?.title || '', /Mirio Design System/);

  const tokens = tokenizeCodeLine('export async function loadData() { return 42; }', 'typescript');
  assert.ok(tokens.some((t) => t.kind === 'keyword' && t.text === 'export'));
  assert.ok(tokens.some((t) => t.kind === 'function' && t.text === 'loadData'));
  assert.ok(tokens.some((t) => t.kind === 'number' && t.text === '42'));

  const pastedCode = buildRichPastedElementPayload(
    '```python\ndef soma(a, b):\n  return a + b\n```',
    { x: 300, y: 300 },
    10,
    'u1'
  );
  assert.equal(pastedCode?.type, 'code');
  assert.equal(pastedCode?.codeLanguage, 'python');

  const pastedEmbed = buildRichPastedElementPayload(
    'https://linear.app/mirio/issue/MIR-142/lancamento-oficial',
    { x: 300, y: 300 },
    11,
    'u1'
  );
  assert.equal(pastedEmbed?.type, 'embed');
  assert.equal(pastedEmbed?.embedProvider, 'linear');
});

test('tableAndKanban: supports dynamic table rows/cols/cells and Kanban card transitions', () => {
  const tableEl = {
    id: 'tb1',
    type: 'table',
    x: 0,
    y: 0,
    tableData: createDefaultTableData(),
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };
  const withRow = addTableRow(tableEl);
  assert.equal(withRow.tableData?.length, 5);

  const withCol = addTableColumn({ ...tableEl, ...withRow });
  assert.equal(withCol.tableData?.[0]?.length, 4);

  const edited = updateTableCell({ ...tableEl, ...withCol }, 1, 2, 'Aprovado');
  assert.equal(edited.tableData?.[1]?.[2], 'Aprovado');

  const cols = createDefaultKanbanColumns();
  const added = addCardToKanbanColumn(cols, 'col_todo', 'Implementar PDF');
  assert.equal(added.columns[0].cards.length, 3);

  const moved = moveKanbanCardBetweenColumns(added.columns, 0, added.newCardId, 1);
  assert.ok(moved !== null);
  assert.equal(moved.columns[0].cards.length, 2);
  assert.ok(moved.columns[1].cards.some((c) => c.id === added.newCardId));
});

test('imageCrop & multi-page PDF export: computes Konva crops and builds valid PDF 1.4 binary', () => {
  const sqCrop = computeAspectPresetCrop(1600, 900, 1);
  assert.ok(Math.abs(sqCrop.width - 900 / 1600) < 0.001);
  assert.equal(sqCrop.height, 1);

  const clamped = clampNormalizedCrop({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 });
  assert.ok(clamped.x + clamped.width <= 1.0001);
  assert.ok(clamped.y + clamped.height <= 1.0001);

  const pixelCrop = toKonvaPixelCrop(sqCrop, 1600, 900);
  assert.deepEqual(pixelCrop, { x: 350, y: 0, width: 900, height: 900 });

  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = buildMultiPagePdfFromJpegs([
    { jpegBytes: fakeJpeg, pixelWidth: 800, pixelHeight: 450, pageWidthPt: 842, pageHeightPt: 474 },
    { jpegBytes: fakeJpeg, pixelWidth: 800, pixelHeight: 450, pageWidthPt: 842, pageHeightPt: 474 },
  ]);
  const pdfText = new TextDecoder().decode(pdf);
  assert.match(pdfText, /^%PDF-1\.4/);
  assert.match(pdfText, /\/Count 2/);
  assert.match(pdfText, /%%EOF$/);
});

test('Platform wiring: Pinned Comments, Trash, PWA SW, Cloud Storage, and Mobile Dock exist (no email invite UI)', () => {
  assert.ok(fs.existsSync(path.resolve('public/sw.js')), 'Service Worker PWA deve existir');
  assert.ok(fs.existsSync(path.resolve('storage.rules')), 'Regras de Object Storage devem existir');
  assert.ok(fs.existsSync(path.resolve('src/services/storageService.ts')), 'storageService deve existir');
  assert.ok(fs.existsSync(path.resolve('src/components/whiteboard/CommentThreadPopover.tsx')), 'CommentThreadPopover deve existir');
  assert.ok(fs.existsSync(path.resolve('src/components/whiteboard/ImageCropModal.tsx')), 'ImageCropModal deve existir');
  assert.ok(fs.existsSync(path.resolve('src/components/whiteboard/MobileCollabDock.tsx')), 'MobileCollabDock deve existir');

  const dashCode = fs.readFileSync(path.resolve('src/pages/DashboardPage.tsx'), 'utf8');
  assert.match(dashCode, /moveBoardToTrash/, 'Dashboard deve suportar mover para a Lixeira');
  assert.match(dashCode, /restoreBoardFromTrash/, 'Dashboard deve suportar restaurar da Lixeira');

  const shareCode = fs.readFileSync(path.resolve('src/components/whiteboard/ShareModal.tsx'), 'utf8');
  assert.doesNotMatch(shareCode, /inviteBoardCollaboratorByEmail/, 'ShareModal não deve expor convite por e-mail');
  assert.doesNotMatch(shareCode, /Adicionar Colaborador por E-mail/, 'ShareModal não deve exibir formulário de e-mail');
});
