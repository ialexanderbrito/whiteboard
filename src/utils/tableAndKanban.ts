import type { CanvasElement, KanbanColumnItem } from '../types/element.ts';

export const DEFAULT_COL_WIDTH = 150;
export const TABLE_ROW_HEIGHT = 38;
export const TABLE_HEADER_HEIGHT = 42;

export function createDefaultTableData(): string[][] {
  return [
    ['Item / Tarefa', 'Responsável', 'Status'],
    ['Definir escopo da Sprint', 'Produto', 'Concluído'],
    ['Implementar API & Regras', 'Engenharia', 'Em andamento'],
    ['Validação com usuários', 'Design', 'Pendente'],
  ];
}

/**
 * Normaliza qualquer representação de `tableData` (`string[][]`, `Array<{ cells: string[] }>`,
 * mapas numéricos `{ "0": "a" }` ou estruturas parciais) em uma matriz retangular `string[][]` válida.
 */
export function normalizeTableData(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createDefaultTableData();
  }

  const parsedRows: string[][] = [];
  let maxCols = 0;

  for (const row of raw) {
    let cells: string[] | null = null;
    if (Array.isArray(row)) {
      cells = row.map((cell) => String(cell ?? ''));
    } else if (row !== null && typeof row === 'object') {
      const maybeCells = (row as { cells?: unknown }).cells;
      if (Array.isArray(maybeCells)) {
        cells = maybeCells.map((cell) => String(cell ?? ''));
      } else {
        const numericKeys = Object.keys(row)
          .filter((k) => /^\d+$/.test(k))
          .sort((a, b) => Number(a) - Number(b));
        if (numericKeys.length > 0) {
          cells = numericKeys.map((k) => String((row as Record<string, unknown>)[k] ?? ''));
        }
      }
    }

    if (cells && cells.length > 0) {
      if (cells.length > maxCols) maxCols = cells.length;
      parsedRows.push(cells);
    }
  }

  if (parsedRows.length === 0 || maxCols === 0) {
    return createDefaultTableData();
  }

  return parsedRows.map((row) =>
    row.length < maxCols ? [...row, ...new Array(maxCols - row.length).fill('')] : row
  );
}

export function computeTableDimensions(
  tableData: ReadonlyArray<ReadonlyArray<string>> | unknown,
  colWidths?: ReadonlyArray<number>
): { width: number; height: number; colWidths: number[] } {
  const safeData = normalizeTableData(tableData);
  const rowCount = Math.max(1, safeData.length);
  const colCount = Math.max(1, safeData[0]?.length || 3);
  const resolvedWidths: number[] = [];

  for (let c = 0; c < colCount; c++) {
    resolvedWidths.push(Math.max(80, colWidths?.[c] ?? DEFAULT_COL_WIDTH));
  }

  const width = resolvedWidths.reduce((sum, w) => sum + w, 0);
  const height = TABLE_HEADER_HEIGHT + Math.max(0, rowCount - 1) * TABLE_ROW_HEIGHT;
  return { width, height, colWidths: resolvedWidths };
}

export function getTableCellLocalRect(
  el: Pick<CanvasElement, 'tableData' | 'tableColWidths'>,
  rowIdx: number,
  colIdx: number
): { offsetX: number; offsetY: number; width: number; height: number; value: string } {
  const rows = normalizeTableData(el.tableData);
  const { colWidths } = computeTableDimensions(rows, el.tableColWidths);
  const clampedRow = Math.max(0, Math.min(rows.length - 1, rowIdx));
  const clampedCol = Math.max(0, Math.min(colWidths.length - 1, colIdx));

  let offsetX = 0;
  for (let c = 0; c < clampedCol; c++) {
    offsetX += colWidths[c];
  }
  const offsetY = clampedRow === 0 ? 0 : TABLE_HEADER_HEIGHT + (clampedRow - 1) * TABLE_ROW_HEIGHT;
  const height = clampedRow === 0 ? TABLE_HEADER_HEIGHT : TABLE_ROW_HEIGHT;
  const width = colWidths[clampedCol] ?? DEFAULT_COL_WIDTH;
  const value = rows[clampedRow]?.[clampedCol] ?? '';

  return { offsetX, offsetY, width, height, value };
}

export function addTableRow(el: CanvasElement): Partial<CanvasElement> {
  const current = normalizeTableData(el.tableData);
  const cols = current[0]?.length || 3;
  const nextData = [...current.map((r) => [...r]), new Array(cols).fill('')];
  const dims = computeTableDimensions(nextData, el.tableColWidths);
  return {
    tableData: nextData,
    tableColWidths: dims.colWidths,
    width: dims.width,
    height: dims.height,
  };
}

export function removeTableRow(el: CanvasElement, rowIndex?: number): Partial<CanvasElement> {
  const current = normalizeTableData(el.tableData);
  if (current.length <= 2) return {};
  const targetIdx = rowIndex !== undefined ? rowIndex : current.length - 1;
  const nextData = current.filter((_, idx) => idx !== targetIdx).map((r) => [...r]);
  const dims = computeTableDimensions(nextData, el.tableColWidths);
  return {
    tableData: nextData,
    tableColWidths: dims.colWidths,
    width: dims.width,
    height: dims.height,
  };
}

export function addTableColumn(el: CanvasElement): Partial<CanvasElement> {
  const current = normalizeTableData(el.tableData);
  const nextColNum = (current[0]?.length || 0) + 1;
  const nextData = current.map((row, rIdx) => [
    ...row,
    rIdx === 0 ? `Coluna ${nextColNum}` : '',
  ]);
  const nextWidths = [...(el.tableColWidths || []), DEFAULT_COL_WIDTH];
  const dims = computeTableDimensions(nextData, nextWidths);
  return {
    tableData: nextData,
    tableColWidths: dims.colWidths,
    width: dims.width,
    height: dims.height,
  };
}

export function removeTableColumn(el: CanvasElement, colIndex?: number): Partial<CanvasElement> {
  const current = normalizeTableData(el.tableData);
  const cols = current[0]?.length || 1;
  if (cols <= 1) return {};
  const targetCol = colIndex !== undefined ? colIndex : cols - 1;
  const nextData = current.map((row) => row.filter((_, cIdx) => cIdx !== targetCol));
  const baseWidths = el.tableColWidths || new Array(cols).fill(DEFAULT_COL_WIDTH);
  const nextWidths = baseWidths.filter((_, cIdx) => cIdx !== targetCol);
  const dims = computeTableDimensions(nextData, nextWidths);
  return {
    tableData: nextData,
    tableColWidths: dims.colWidths,
    width: dims.width,
    height: dims.height,
  };
}

export function updateTableCell(
  el: CanvasElement,
  rowIdx: number,
  colIdx: number,
  value: string
): Partial<CanvasElement> {
  const current = normalizeTableData(el.tableData);
  const nextData = current.map((row, r) =>
    row.map((cell, c) => (r === rowIdx && c === colIdx ? value : cell))
  );
  return { tableData: nextData };
}

// ============================================================================
// QUADRO KANBAN NATIVO
// ============================================================================

export const KANBAN_COL_WIDTH = 228;
export const KANBAN_COL_GAP = 12;
export const KANBAN_PADDING = 14;
export const KANBAN_TOP_BAR_HEIGHT = 46;
export const KANBAN_COL_HEADER_HEIGHT = 36;
export const KANBAN_CARD_HEIGHT = 56;
export const KANBAN_CARD_GAP = 8;

export function createDefaultKanbanColumns(): KanbanColumnItem[] {
  return [
    {
      id: 'col_todo',
      title: 'A Fazer',
      color: '#64748b',
      cards: [
        { id: 'c_1', title: 'Mapear requisitos críticos', tag: 'Discovery' },
        { id: 'c_2', title: 'Criar protótipo navegável', tag: 'Design' },
      ],
    },
    {
      id: 'col_doing',
      title: 'Em Progresso',
      color: '#2563eb',
      cards: [{ id: 'c_3', title: 'Integrar colaboração em tempo real', tag: 'Core' }],
    },
    {
      id: 'col_done',
      title: 'Concluído',
      color: '#10b981',
      cards: [{ id: 'c_4', title: 'Setup inicial do projeto', tag: 'Infra', completed: true }],
    },
  ];
}

export function computeKanbanDimensions(columns: ReadonlyArray<KanbanColumnItem>): {
  width: number;
  height: number;
} {
  const colCount = Math.max(1, columns.length);
  const maxCards = columns.reduce((max, col) => Math.max(max, col.cards.length), 1);

  const width =
    KANBAN_PADDING * 2 + colCount * KANBAN_COL_WIDTH + Math.max(0, colCount - 1) * KANBAN_COL_GAP;
  const height = Math.max(
    260,
    KANBAN_TOP_BAR_HEIGHT +
      KANBAN_PADDING * 2 +
      KANBAN_COL_HEADER_HEIGHT +
      maxCards * (KANBAN_CARD_HEIGHT + KANBAN_CARD_GAP) +
      44
  );

  return { width, height };
}

export function addCardToKanbanColumn(
  columns: ReadonlyArray<KanbanColumnItem>,
  columnId: string,
  title = 'Nova tarefa'
): { columns: KanbanColumnItem[]; newCardId: string; width: number; height: number } {
  const newCardId = `kcard_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const nextCols = columns.map((col) =>
    col.id === columnId
      ? {
          ...col,
          cards: [...col.cards, { id: newCardId, title }],
        }
      : { ...col, cards: [...col.cards] }
  );
  const dims = computeKanbanDimensions(nextCols);
  return { columns: nextCols, newCardId, ...dims };
}

export function moveKanbanCardBetweenColumns(
  columns: ReadonlyArray<KanbanColumnItem>,
  fromColIdx: number,
  cardId: string,
  direction: -1 | 1
): { columns: KanbanColumnItem[]; width: number; height: number } | null {
  const targetColIdx = fromColIdx + direction;
  if (targetColIdx < 0 || targetColIdx >= columns.length) return null;

  const sourceCol = columns[fromColIdx];
  const card = sourceCol?.cards.find((c) => c.id === cardId);
  if (!card) return null;

  const nextCols = columns.map((col, idx) => {
    if (idx === fromColIdx) {
      return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
    }
    if (idx === targetColIdx) {
      const isDoneCol = idx === columns.length - 1 && columns.length >= 2;
      return { ...col, cards: [...col.cards, { ...card, completed: isDoneCol ? true : card.completed }] };
    }
    return { ...col, cards: [...col.cards] };
  });

  const dims = computeKanbanDimensions(nextCols);
  return { columns: nextCols, ...dims };
}

export type KanbanEditableTarget =
  | { kind: 'boardTitle' }
  | { kind: 'column'; colId: string }
  | { kind: 'card'; colId: string; cardId: string };

export function getKanbanFieldLocalRect(
  columns: ReadonlyArray<KanbanColumnItem>,
  target: KanbanEditableTarget
): { offsetX: number; offsetY: number; width: number; height: number } {
  const safeCols = columns.length > 0 ? columns : createDefaultKanbanColumns();
  const { width: boardWidth } = computeKanbanDimensions(safeCols);

  if (target.kind === 'boardTitle') {
    return {
      offsetX: KANBAN_PADDING,
      offsetY: 10,
      width: Math.max(140, boardWidth - KANBAN_PADDING * 2),
      height: 28,
    };
  }

  const colIdx = Math.max(
    0,
    safeCols.findIndex((c) => c.id === target.colId)
  );
  const colX = KANBAN_PADDING + colIdx * (KANBAN_COL_WIDTH + KANBAN_COL_GAP);

  if (target.kind === 'column') {
    return {
      offsetX: colX + 24,
      offsetY: KANBAN_TOP_BAR_HEIGHT + 6,
      width: KANBAN_COL_WIDTH - 56,
      height: 24,
    };
  }

  const col = safeCols[colIdx];
  const rawCardIdx = col ? col.cards.findIndex((c) => c.id === target.cardId) : 0;
  const cardIdx = rawCardIdx >= 0 ? rawCardIdx : Math.max(0, (col?.cards.length ?? 1) - 1);
  const cardY = KANBAN_COL_HEADER_HEIGHT + cardIdx * (KANBAN_CARD_HEIGHT + KANBAN_CARD_GAP);

  return {
    offsetX: colX + 34,
    offsetY: KANBAN_TOP_BAR_HEIGHT + cardY + 7,
    width: KANBAN_COL_WIDTH - 50,
    height: 28,
  };
}

export function resolveKanbanDropTarget(
  columns: ReadonlyArray<KanbanColumnItem>,
  fromColIdx: number,
  localCenterX: number,
  localCenterY: number
): { toColIdx: number; toCardIdx: number } {
  const colCount = Math.max(1, columns.length);
  const colStride = KANBAN_COL_WIDTH + KANBAN_COL_GAP;
  const rawColIdx = Math.floor((localCenterX - KANBAN_PADDING + KANBAN_COL_GAP / 2) / colStride);
  const toColIdx = Math.max(0, Math.min(colCount - 1, rawColIdx));

  const targetCol = columns[toColIdx];
  const cardCount = targetCol ? targetCol.cards.length : 0;
  const cardStride = KANBAN_CARD_HEIGHT + KANBAN_CARD_GAP;
  const relY = localCenterY - (KANBAN_TOP_BAR_HEIGHT + KANBAN_COL_HEADER_HEIGHT);
  const rawCardIdx = Math.round((relY - KANBAN_CARD_HEIGHT / 2) / cardStride);

  const maxIdx = toColIdx === fromColIdx ? Math.max(0, cardCount - 1) : cardCount;
  const toCardIdx = Math.max(0, Math.min(maxIdx, rawCardIdx));

  return { toColIdx, toCardIdx };
}

export function reorderOrMoveKanbanCard(
  columns: ReadonlyArray<KanbanColumnItem>,
  fromColIdx: number,
  cardId: string,
  toColIdx: number,
  toCardIdx: number
): { columns: KanbanColumnItem[]; width: number; height: number } | null {
  if (
    fromColIdx < 0 ||
    fromColIdx >= columns.length ||
    toColIdx < 0 ||
    toColIdx >= columns.length
  ) {
    return null;
  }

  const sourceCol = columns[fromColIdx];
  const fromCardIdx = sourceCol.cards.findIndex((c) => c.id === cardId);
  if (fromCardIdx === -1) return null;

  const movingCard = sourceCol.cards[fromCardIdx];

  if (fromColIdx === toColIdx) {
    const remaining = sourceCol.cards.filter((c) => c.id !== cardId);
    const clampedIdx = Math.max(0, Math.min(remaining.length, toCardIdx));
    if (clampedIdx === fromCardIdx) return null;

    const reordered = [...remaining];
    reordered.splice(clampedIdx, 0, { ...movingCard });

    const nextCols = columns.map((col, idx) =>
      idx === fromColIdx ? { ...col, cards: reordered } : { ...col, cards: [...col.cards] }
    );
    const dims = computeKanbanDimensions(nextCols);
    return { columns: nextCols, ...dims };
  }

  const isMovingIntoDoneCol = toColIdx === columns.length - 1 && columns.length >= 2;
  const wasInDoneCol = fromColIdx === columns.length - 1 && columns.length >= 2;
  const updatedCard = {
    ...movingCard,
    completed: isMovingIntoDoneCol
      ? true
      : wasInDoneCol
        ? false
        : movingCard.completed,
  };

  const nextCols = columns.map((col, idx) => {
    if (idx === fromColIdx) {
      return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
    }
    if (idx === toColIdx) {
      const nextCards = [...col.cards];
      const clampedIdx = Math.max(0, Math.min(nextCards.length, toCardIdx));
      nextCards.splice(clampedIdx, 0, updatedCard);
      return { ...col, cards: nextCards };
    }
    return { ...col, cards: [...col.cards] };
  });

  const dims = computeKanbanDimensions(nextCols);
  return { columns: nextCols, ...dims };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Converte recursivamente valores para formato 100% compatível com o Cloud Firestore:
 * - Remove chaves `undefined`
 * - Converte `tableData: string[][]` (array aninhado rejeitado pelo Firestore com "Nested arrays are not supported")
 *   em `Array<{ cells: string[] }>`
 * - Encapsula qualquer outro array aninhado em `{ __nestedArray: true, items: [...] }`
 */
export function serializeForFirestoreValue(value: unknown, keyHint?: string): unknown {
  if (value === undefined || value === null) return value;

  if (keyHint === 'tableData' && Array.isArray(value)) {
    return value
      .filter((row) => row !== undefined && row !== null)
      .map((row) => {
        if (Array.isArray(row)) {
          return { cells: row.map((cell) => String(cell ?? '')) };
        }
        if (isPlainRecord(row) && Array.isArray(row.cells)) {
          return { cells: row.cells.map((cell) => String(cell ?? '')) };
        }
        return { cells: [String(row)] };
      });
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => {
        if (Array.isArray(item)) {
          return {
            __nestedArray: true,
            items: serializeForFirestoreValue(item),
          };
        }
        return serializeForFirestoreValue(item);
      });
  }

  if (isPlainRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = serializeForFirestoreValue(v, k);
      }
    }
    return out;
  }

  return value;
}

/**
 * Reconstrói dados vindos do Cloud Firestore (ou localStorage/JSON), restaurando
 * `tableData` de `Array<{ cells: string[] }>` de volta para `string[][]`.
 */
export function deserializeFromFirestoreValue(value: unknown, keyHint?: string): unknown {
  if (value === undefined || value === null) return value;

  if (keyHint === 'tableData') {
    return normalizeTableData(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        (item as { __nestedArray?: unknown }).__nestedArray === true &&
        Array.isArray((item as { items?: unknown }).items)
      ) {
        return deserializeFromFirestoreValue((item as { items: unknown[] }).items);
      }
      return deserializeFromFirestoreValue(item);
    });
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deserializeFromFirestoreValue(v, k);
    }
    return out;
  }

  return value;
}

export function serializeElementForFirestore(element: CanvasElement): Record<string, unknown> {
  return serializeForFirestoreValue(element) as Record<string, unknown>;
}

export function deserializeElementFromFirestore(
  id: string,
  rawData: Record<string, unknown>
): CanvasElement {
  const restored = deserializeFromFirestoreValue(rawData) as Record<string, unknown>;
  return {
    ...restored,
    id,
  } as unknown as CanvasElement;
}
