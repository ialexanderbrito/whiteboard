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
  tokenizeCodeBlock,
  CODE_LANGUAGES,
  CODE_LANGUAGE_GROUPS,
  CODE_LANGUAGE_TEMPLATES,
  normalizeCodeLanguage,
  getCodeLanguageLabel,
  getDefaultCodeSnippet,
  isUntouchedDefaultCodeSnippet,
} from '../src/utils/richEmbeds.ts';
import {
  createDefaultTableData,
  normalizeTableData,
  getTableCellLocalRect,
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  updateTableCell,
  createDefaultKanbanColumns,
  addCardToKanbanColumn,
  moveKanbanCardBetweenColumns,
  reorderOrMoveKanbanCard,
  resolveKanbanDropTarget,
  getKanbanFieldLocalRect,
  serializeElementForFirestore,
  deserializeElementFromFirestore,
  serializeForFirestoreValue,
} from '../src/utils/tableAndKanban.ts';
import {
  clampNormalizedCrop,
  computeAspectPresetCrop,
  toKonvaPixelCrop,
} from '../src/utils/imageCrop.ts';
import { buildMultiPagePdfFromJpegs } from '../src/utils/boardExport.ts';
import {
  publishElementDragOffset,
  resolveDraggedWorldBounds,
  subscribeElementDragOffset,
} from '../src/utils/viewport.ts';
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

test('CodeBlock language selector: uses searchable shadcn Combobox (Popover + Command) + Select font size with 25+ languages', () => {
  assert.ok(CODE_LANGUAGES.length >= 25, 'Deve disponibilizar pelo menos 25 linguagens no bloco de código');
  assert.ok(CODE_LANGUAGE_GROUPS.length >= 4, 'Deve organizar as linguagens em grupos semânticos');

  assert.equal(normalizeCodeLanguage('ts'), 'typescript');
  assert.equal(normalizeCodeLanguage('js'), 'javascript');
  assert.equal(normalizeCodeLanguage('py'), 'python');
  assert.equal(normalizeCodeLanguage('c#'), 'csharp');
  assert.equal(normalizeCodeLanguage('c++'), 'cpp');
  assert.equal(normalizeCodeLanguage('yml'), 'yaml');
  assert.equal(normalizeCodeLanguage('sh'), 'bash');
  assert.equal(getCodeLanguageLabel('csharp'), 'C#');

  const controlsCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/context-bar/SpecializedElementControls.tsx'),
    'utf8'
  );
  assert.doesNotMatch(controlsCode, /<select\b/, 'Não deve usar <select> HTML nativo');
  assert.match(controlsCode, /<CommandInput/, 'Seletor de linguagem deve usar CommandInput pesquisável');
  assert.match(controlsCode, /<CommandGroup/, 'Linguagens devem ser agrupadas via CommandGroup');
  assert.match(controlsCode, /<CommandItem/, 'Cada linguagem deve ser um CommandItem navegável por teclado');
  assert.match(controlsCode, /<SelectTrigger/, 'Seletor de tamanho da fonte do código deve usar SelectTrigger do shadcn/ui');
  assert.match(controlsCode, /<SelectGroup>/, 'SelectItem deve estar dentro de SelectGroup conforme regra shadcn');
  assert.match(controlsCode, /<SelectItem/, 'Deve renderizar SelectItem do shadcn/ui');

  const selectUiCode = fs.readFileSync(
    path.resolve('src/components/ui/select.tsx'),
    'utf8'
  );
  assert.doesNotMatch(
    selectUiCode,
    /\[&>span\]:line-clamp-1/,
    'SelectTrigger não deve usar [&>span]:line-clamp-1 pois empilha ícone acima do texto via -webkit-box-orient: vertical'
  );
  assert.match(
    controlsCode,
    /flex-row flex-nowrap items-center shrink-0 whitespace-nowrap/,
    'Gatilho da linguagem do bloco de código deve manter ícone, nome e seta alinhados em linha única'
  );

  const codeBlockItemCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/CodeBlockItem.tsx'),
    'utf8'
  );
  assert.match(
    codeBlockItemCode,
    /mirio:open-code-language-picker/,
    'Cabeçalho do CodeBlockItem também deve permitir abrir o seletor de linguagem com 1 clique'
  );
});

test('CodeBlock syntax highlighting & templates: enforces authentic per-language tokens across all 27 languages', () => {
  // Todas as 27 linguagens possuem snippet idiomático próprio
  for (const lang of CODE_LANGUAGES) {
    assert.ok(
      typeof CODE_LANGUAGE_TEMPLATES[lang.id] === 'string' &&
        CODE_LANGUAGE_TEMPLATES[lang.id].trim().length > 15,
      `Linguagem ${lang.id} deve possuir template idiomático dedicado`
    );
    assert.equal(isUntouchedDefaultCodeSnippet(getDefaultCodeSnippet(lang.id)), true);
  }
  assert.equal(isUntouchedDefaultCodeSnippet('const meuCodigo = 123;'), false);

  // JSON: chaves como 'property', strings de valor como 'string', booleanos como 'constant' e URLs intactas
  const jsonTokens = tokenizeCodeLine('  "endpoint": "https://mirio.app/api", "active": true, "port": 8080', 'json');
  assert.ok(jsonTokens.some((t) => t.kind === 'property' && t.text === '"endpoint"'));
  assert.ok(jsonTokens.some((t) => t.kind === 'string' && t.text === '"https://mirio.app/api"'));
  assert.ok(jsonTokens.some((t) => t.kind === 'constant' && t.text === 'true'));
  assert.ok(jsonTokens.some((t) => t.kind === 'number' && t.text === '8080'));
  assert.ok(!jsonTokens.some((t) => t.kind === 'comment'), 'URL em JSON nunca deve virar comentário //');

  // HTML: tags em 'tag', atributos em 'property', valores em 'string' e texto interno nunca colorido como SQL
  const htmlTokens = tokenizeCodeLine('<section class="hero" id="#main">select from table</section>', 'html');
  assert.ok(htmlTokens.some((t) => t.kind === 'tag' && t.text === 'section'));
  assert.ok(htmlTokens.some((t) => t.kind === 'property' && t.text === 'class'));
  assert.ok(htmlTokens.some((t) => t.kind === 'string' && t.text === '"#main"'));
  assert.ok(htmlTokens.some((t) => t.kind === 'plain' && t.text.includes('select from table')));

  // CSS: seletor em 'tag', pseudo-classe em 'decorator', propriedade em 'property', #hex e px em 'number'
  const cssLines = tokenizeCodeBlock('.card:hover {\n  background-color: #0f172a;\n  padding: 12px !important;\n}', 'css');
  assert.ok(cssLines[0].some((t) => t.kind === 'tag' && t.text === '.card'));
  assert.ok(cssLines[0].some((t) => t.kind === 'decorator' && t.text === ':hover'));
  assert.ok(cssLines[1].some((t) => t.kind === 'property' && t.text === 'background-color'));
  assert.ok(cssLines[1].some((t) => t.kind === 'number' && t.text === '#0f172a'));
  assert.ok(cssLines[2].some((t) => t.kind === 'keyword' && t.text === '!important'));

  // SQL: cláusulas case-insensitive, funções agregadas, tipos e comentários '--'
  const sqlTokens = tokenizeCodeLine('SELECT b.title, COUNT(b.id) FROM boards b WHERE b.deleted_at IS NULL -- ativos', 'sql');
  assert.ok(sqlTokens.some((t) => t.kind === 'keyword' && t.text === 'SELECT'));
  assert.ok(sqlTokens.some((t) => t.kind === 'property' && t.text === 'title'));
  assert.ok(sqlTokens.some((t) => t.kind === 'function' && t.text === 'COUNT'));
  assert.ok(sqlTokens.some((t) => t.kind === 'constant' && t.text === 'NULL'));
  assert.ok(sqlTokens.some((t) => t.kind === 'comment' && t.text.startsWith('--')));

  // C++ / Rust / Bash / Dockerfile: sem falsos comentários '#' ou '--'
  const cppTokens = tokenizeCodeLine('#include <vector>', 'cpp');
  assert.ok(cppTokens.some((t) => t.kind === 'decorator' && t.text === '#include'));
  assert.ok(cppTokens.some((t) => t.kind === 'string' && t.text === '<vector>'));

  const rustTokens = tokenizeCodeLine('#[derive(Debug)] pub fn log() { println!("ok"); }', 'rust');
  assert.ok(rustTokens.some((t) => t.kind === 'decorator' && t.text === '#[derive(Debug)]'));
  assert.ok(rustTokens.some((t) => t.kind === 'function' && t.text === 'println!'));

  const bashTokens = tokenizeCodeLine('npm run build -- --outDir dist && echo $NODE_ENV', 'bash');
  assert.ok(bashTokens.some((t) => t.kind === 'property' && t.text === '--outDir'));
  assert.ok(bashTokens.some((t) => t.kind === 'decorator' && t.text === '$NODE_ENV'));
  assert.ok(!bashTokens.some((t) => t.kind === 'comment'));
});

test('Kanban drag-and-drop & inline editor: reorders cards, moves across columns, and never leaves input stuck', () => {
  const cols = createDefaultKanbanColumns();
  const added = addCardToKanbanColumn(cols, 'col_todo', 'Card recém-criado');
  assert.equal(added.columns[0].cards.length, 3);

  // Reordenar card dentro da mesma coluna (do fim para o topo)
  const reordered = reorderOrMoveKanbanCard(added.columns, 0, added.newCardId, 0, 0);
  assert.ok(reordered !== null);
  assert.equal(reordered.columns[0].cards[0].id, added.newCardId);

  // Arrastar card para a última coluna ("Concluído") marca completed: true, e voltar desmarca
  const movedToDone = reorderOrMoveKanbanCard(reordered.columns, 0, added.newCardId, 2, 1);
  assert.ok(movedToDone !== null);
  const doneCard = movedToDone.columns[2].cards.find((c) => c.id === added.newCardId);
  assert.equal(doneCard?.completed, true);

  const movedBackToDoing = reorderOrMoveKanbanCard(movedToDone.columns, 2, added.newCardId, 1, 0);
  assert.ok(movedBackToDoing !== null);
  assert.equal(movedBackToDoing.columns[1].cards[0].id, added.newCardId);
  assert.equal(movedBackToDoing.columns[1].cards[0].completed, false);

  // Cálculo de coordenadas locais e alvo de soltura
  const cardRect = getKanbanFieldLocalRect(movedBackToDoing.columns, {
    kind: 'card',
    colId: 'col_doing',
    cardId: added.newCardId,
  });
  assert.ok(cardRect.offsetX > 200);
  assert.ok(cardRect.width > 120);

  const dropTarget = resolveKanbanDropTarget(movedBackToDoing.columns, 1, 600, 140);
  assert.equal(dropTarget.toColIdx, 2);

  // Garante que WhiteboardCanvas fecha/salva widgetFieldEditor em mousedown/touchstart/dragstart
  const canvasCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'),
    'utf8'
  );
  assert.match(canvasCode, /const commitWidgetFieldEditor = useCallback/);
  assert.match(canvasCode, /widgetFieldEditorRef\.current/);
  assert.match(canvasCode, /id="widget-field-editor-control"/);

  const kanbanCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/KanbanItem.tsx'),
    'utf8'
  );
  assert.match(kanbanCode, /reorderOrMoveKanbanCard/);
  assert.match(kanbanCode, /onCommitActiveEdit/);
});

test('Minimap button next to Zoom and ? & updated KeyboardShortcutsModal', () => {
  const toolbarCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/Toolbar.tsx'),
    'utf8'
  );
  assert.match(toolbarCode, /data-minimap-toggle="true"/, 'Toolbar deve exibir botão rápido de Minimapa ao lado do Zoom e do ?');

  const boardPageCode = fs.readFileSync(
    path.resolve('src/pages/BoardPage.tsx'),
    'utf8'
  );
  assert.match(boardPageCode, /onToggleMinimap=\{\(\) => handleToggleMinimap\(\)\}/);

  const shortcutsCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/KeyboardShortcutsModal.tsx'),
    'utf8'
  );
  assert.match(shortcutsCode, /keys:\s*\['M'\][\s\S]*?Minimapa/);
  assert.match(shortcutsCode, /keys:\s*\['Ctrl',\s*'F'\]/);
  assert.match(shortcutsCode, /keys:\s*\['Ctrl',\s*'G'\]/);
  assert.match(shortcutsCode, /keys:\s*\['Ctrl',\s*'Alt',\s*'C'\]/);
  assert.match(shortcutsCode, /keys:\s*\['K'\][\s\S]*?Comentário/);
});

test('Firestore Table + Kanban persistence: tableData 2D array is serialized without nested arrays so onSnapshot never wipes Table when adding Kanban', () => {
  function hasFirestoreForbiddenNestedArray(val) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (Array.isArray(item) || hasFirestoreForbiddenNestedArray(item)) {
          return true;
        }
      }
      return false;
    }
    if (val && typeof val === 'object') {
      return Object.values(val).some((v) => hasFirestoreForbiddenNestedArray(v));
    }
    return false;
  }

  const rawTable = {
    id: 'elem_table_1',
    type: 'table',
    x: 120,
    y: 160,
    width: 450,
    height: 156,
    tableData: createDefaultTableData(),
    tableColWidths: [150, 150, 150],
    tableHeaderRow: true,
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1000,
  };

  // Antes da serialização, tableData é string[][] (proibido diretamente no Firestore)
  assert.equal(hasFirestoreForbiddenNestedArray(rawTable), true);

  // Após serializeElementForFirestore, NENHUM array aninhado existe no documento enviado ao setDoc/batch.set
  const firestoreDoc = serializeElementForFirestore(rawTable);
  assert.equal(
    hasFirestoreForbiddenNestedArray(firestoreDoc),
    false,
    'Payload enviado ao Firestore nunca pode conter arrays diretamente aninhados'
  );

  // Atualizações parciais (updateDoc / batch.update) também ficam livres de arrays aninhados
  const rowAdded = addTableRow(rawTable);
  const serializedUpdate = serializeForFirestoreValue(rowAdded.tableData, 'tableData');
  assert.equal(hasFirestoreForbiddenNestedArray(serializedUpdate), false);

  // Ao receber onSnapshot após criar um Kanban em seguida, deserializeElementFromFirestore reconstrói string[][] intacto
  const restored = deserializeElementFromFirestore('elem_table_1', firestoreDoc);
  assert.deepEqual(restored.tableData, rawTable.tableData);
  assert.deepEqual(restored.tableColWidths, [150, 150, 150]);

  const serviceCode = fs.readFileSync(path.resolve('src/services/elementService.ts'), 'utf8');
  assert.match(serviceCode, /serializeElementForFirestore\(fullElement\)/);
  assert.match(serviceCode, /deserializeElementFromFirestore\(/);
  assert.match(serviceCode, /serializeForFirestoreValue\(value,\s*key\)/);
});

test('Table self-healing & spreadsheet UX: normalizes { cells } payloads, updates cells without crashing, and blocks shortcut flickering', () => {
  const defaultMatrix = createDefaultTableData();
  const firestoreRowsPayload = defaultMatrix.map((row) => ({ cells: [...row] }));

  // Mesmo se um payload bruto { cells: string[] }[] chegar via cache/HMR, normalizeTableData recupera 100% dos textos
  assert.deepEqual(normalizeTableData(firestoreRowsPayload), defaultMatrix);
  assert.deepEqual(normalizeTableData(undefined), defaultMatrix);
  assert.deepEqual(normalizeTableData([]), defaultMatrix);
  assert.deepEqual(
    normalizeTableData([{ '0': 'Col A', '1': 'Col B' }, ['Valor 1']]),
    [
      ['Col A', 'Col B'],
      ['Valor 1', ''],
    ]
  );

  // Operações de edição de célula, linha e coluna funcionam mesmo sobre um elemento com tableData em formato { cells }
  const unnormalizedTable = {
    id: 'tb_raw',
    type: 'table',
    x: 100,
    y: 100,
    tableData: firestoreRowsPayload,
    tableColWidths: [150, 150, 150],
    zIndex: 1,
    updatedBy: 'u1',
    updatedAt: 1,
  };

  const cellUpdated = updateTableCell(unnormalizedTable, 1, 0, 'Escrever funcionando');
  assert.equal(cellUpdated.tableData?.[1]?.[0], 'Escrever funcionando');
  assert.equal(cellUpdated.tableData?.[0]?.[0], 'Item / Tarefa');

  const rowAdded = addTableRow(unnormalizedTable);
  assert.equal(rowAdded.tableData?.length, 5);
  const rowRemoved = removeTableRow({ ...unnormalizedTable, ...rowAdded });
  assert.equal(rowRemoved.tableData?.length, 4);

  const colAdded = addTableColumn(unnormalizedTable);
  assert.equal(colAdded.tableData?.[0]?.length, 4);
  const colRemoved = removeTableColumn({ ...unnormalizedTable, ...colAdded });
  assert.equal(colRemoved.tableData?.[0]?.length, 3);

  const cellRect = getTableCellLocalRect(unnormalizedTable, 1, 2);
  assert.equal(cellRect.offsetX, 300);
  assert.equal(cellRect.offsetY, 42);
  assert.equal(cellRect.value, 'Concluído');

  // Verifica blindagem de UI em TableItem.tsx e WhiteboardCanvas.tsx (foco de célula, teclado de planilha e anti-flicker)
  const tableItemCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/TableItem.tsx'),
    'utf8'
  );
  assert.match(tableItemCode, /normalizeTableData\(element\.tableData\)/);
  assert.match(tableItemCode, /activeCell\?: \{ rowIdx: number; colIdx: number \} \| null/);

  const canvasCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx'),
    'utf8'
  );
  assert.match(canvasCode, /openTableCellEditorByCoords/);
  assert.doesNotMatch(
    canvasCode,
    /if \(widgetFieldEditor\?\.elementId === id\) return;/,
    'Transformer não deve desconectar ao abrir widgetFieldEditor para não piscar a seleção'
  );
});

test('Zero-flicker Table drag: SelectionContextBar & ConnectorHandles sync at 60fps without snap-back, and +Linha/+Coluna do not inflate Transformer', () => {
  const initialBounds = { x: 200, y: 150, w: 450, h: 156 };
  const draggedIds = new Set(['tb_drag_1']);
  const initialBoundsById = new Map([['tb_drag_1', initialBounds]]);

  let notifications = 0;
  const unsub = subscribeElementDragOffset(() => {
    notifications += 1;
  });

  // 1. Durante o arraste ativo (+180px X, +120px Y)
  publishElementDragOffset({
    active: true,
    draggedIds,
    initialBoundsById,
    dx: 180,
    dy: 120,
  });
  const liveBounds = resolveDraggedWorldBounds('tb_drag_1', initialBounds);
  assert.deepEqual(liveBounds, { x: 380, y: 270, w: 450, h: 156 });

  // 2. No instante exato do mouseup (antes do React comitar o novo element.x/y), mantém (380, 270) sem voltar a (200, 150)
  publishElementDragOffset({
    active: false,
    draggedIds,
    initialBoundsById,
    dx: 180,
    dy: 120,
  });
  const preCommitBounds = resolveDraggedWorldBounds('tb_drag_1', initialBounds);
  assert.deepEqual(preCommitBounds, { x: 380, y: 270, w: 450, h: 156 });

  // 3. Assim que o React comita (380, 270), resolve suavemente para committedBounds com 0px de salto
  const postCommitBounds = resolveDraggedWorldBounds('tb_drag_1', {
    x: 380,
    y: 270,
    w: 450,
    h: 156,
  });
  assert.deepEqual(postCommitBounds, { x: 380, y: 270, w: 450, h: 156 });

  publishElementDragOffset(null);
  unsub();
  assert.ok(notifications >= 3);

  const tableItemCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/TableItem.tsx'),
    'utf8'
  );
  assert.match(tableItemCode, /excludeFromTransformerBounds/);
  assert.match(tableItemCode, /renderPosRef/);

  const contextBarCode = fs.readFileSync(
    path.resolve('src/components/whiteboard/SelectionContextBar.tsx'),
    'utf8'
  );
  assert.match(contextBarCode, /subscribeElementDragOffset/);
  assert.match(contextBarCode, /resolveDraggedWorldBounds/);
});
