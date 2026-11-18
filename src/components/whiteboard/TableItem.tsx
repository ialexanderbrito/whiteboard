import React, { useLayoutEffect, useRef } from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import {
  normalizeTableData,
  computeTableDimensions,
  addTableRow,
  addTableColumn,
  getTableCellLocalRect,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
} from '../../utils/tableAndKanban';
import { getContrastTextColor } from '../../utils/colors';
import { isCoarseOrMobileViewport } from '../../utils/viewport';
import { LockBadge } from './LockBadge';

interface TableItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  isDark?: boolean;
  activeCell?: { rowIdx: number; colIdx: number } | null;
  editingCell?: { rowIdx: number; colIdx: number } | null;
  onSelectCell?: (elementId: string, rowIdx: number, colIdx: number) => void;
  onCommitActiveEdit?: () => void;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onEditCell?: (
    elementId: string,
    rowIdx: number,
    colIdx: number,
    cellRect: { worldX: number; worldY: number; width: number; height: number },
    currentValue: string
  ) => void;
}

export const TableItem: React.FC<TableItemProps> = React.memo(
  ({
    element,
    isSelected,
    userSelectionColor = '#0284c7',
    remoteSelector,
    draggable = true,
    canEdit = true,
    isDark = false,
    activeCell = null,
    editingCell = null,
    onSelectCell,
    onCommitActiveEdit,
    onSelect,
    onChange,
    onEditCell,
  }) => {
    const groupRef = useRef<Konva.Group>(null);
    const addRowGroupRef = useRef<Konva.Group>(null);
    const addColGroupRef = useRef<Konva.Group>(null);
    const isDraggingRef = useRef(false);
    const renderPosRef = useRef({ x: element.x, y: element.y });
    const lastCellClickTimeRef = useRef<number>(0);

    if (!isDraggingRef.current && !groupRef.current?.isDragging()) {
      renderPosRef.current = { x: element.x, y: element.y };
    }

    // Exclui os botões externos (+ Linha / + Coluna) do bounding box do Transformer
    // para que a moldura de seleção, SmartGuides e ConnectorHandles coincidam 1:1 com a tabela.
    useLayoutEffect(() => {
      const excludeFromTransformerBounds = (node: Konva.Group | null) => {
        if (!node) return;
        const tagged = node as Konva.Group & {
          __origGetClientRect?: Konva.Group['getClientRect'];
        };
        if (!tagged.__origGetClientRect) {
          tagged.__origGetClientRect = node.getClientRect.bind(node);
        }
        const orig = tagged.__origGetClientRect;
        node.getClientRect = (cfg?: Parameters<Konva.Group['getClientRect']>[0]) => {
          if (cfg && (cfg as { _forDrawing?: boolean })._forDrawing) {
            return orig(cfg);
          }
          return { x: 0, y: 0, width: 0, height: 0 };
        };
      };
      excludeFromTransformerBounds(addRowGroupRef.current);
      excludeFromTransformerBounds(addColGroupRef.current);
    }, [isSelected, canEdit, element.locked]);

    const rows = normalizeTableData(element.tableData);
    const { width, height, colWidths } = computeTableDimensions(rows, element.tableColWidths);
    const hasHeader = element.tableHeaderRow !== false;

    const surfaceBg = isDark ? '#18181b' : '#ffffff';
    const zebraBg = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.018)';
    const headerBg =
      element.fill && element.fill !== 'transparent'
        ? element.fill
        : isDark
          ? '#27272a'
          : '#f1f5f9';
    const headerTextColor =
      element.fill && element.fill !== 'transparent'
        ? getContrastTextColor(element.fill, '#0f172a', '#f8fafc')
        : isDark
          ? '#f4f4f5'
          : '#0f172a';
    const gridStroke = isDark ? '#3f3f46' : '#cbd5e1';
    const textPrimary = isDark ? '#f4f4f5' : '#0f172a';
    const textMuted = isDark ? '#71717a' : '#94a3b8';
    const activeBorder = remoteSelector
      ? remoteSelector.color
      : isSelected && element.locked
        ? userSelectionColor
        : gridStroke;

    const fontSize = Math.min(20, Math.max(11, element.fontSize || 13));

    const getLiveOrigin = () => ({
      x: groupRef.current ? Math.round(groupRef.current.x()) : element.x,
      y: groupRef.current ? Math.round(groupRef.current.y()) : element.y,
    });

    const openCellEditor = (rIdx: number, cIdx: number, cellX: number, cellY: number, colW: number, cellH: number, val: string) => {
      if (!canEdit || element.locked || !onEditCell) return;
      const origin = getLiveOrigin();
      onSelectCell?.(element.id, rIdx, cIdx);
      onEditCell(
        element.id,
        rIdx,
        cIdx,
        {
          worldX: origin.x + cellX,
          worldY: origin.y + cellY,
          width: colW,
          height: cellH,
        },
        val
      );
    };

    // Coordenadas X acumuladas por coluna
    const colOffsets: number[] = [];
    let accX = 0;
    for (let c = 0; c < colWidths.length; c++) {
      colOffsets.push(accX);
      accX += colWidths[c];
    }

    return (
      <Group
        ref={groupRef}
        id={element.id}
        x={renderPosRef.current.x}
        y={renderPosRef.current.y}
        rotation={element.rotation || 0}
        draggable={draggable && !element.locked}
        dragDistance={5}
        onClick={(e) => {
          if (isDraggingRef.current) return;
          onSelect(e);
        }}
        onTap={(e) => {
          if (isDraggingRef.current) return;
          onSelect(e);
        }}
        onDragStart={(e) => {
          if ((e.target as Konva.Node) !== groupRef.current) return;
          isDraggingRef.current = true;
          onCommitActiveEdit?.();
        }}
        onDragEnd={(e) => {
          if ((e.target as Konva.Node) !== groupRef.current) return;
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 60);
          onChange({
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y()),
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const sx = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          const scaledWidths = colWidths.map((w) => Math.max(80, Math.round(w * sx)));
          const dims = computeTableDimensions(rows, scaledWidths);
          onChange({
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            tableColWidths: dims.colWidths,
            width: dims.width,
            height: dims.height,
            rotation: Math.round(node.rotation()),
          });
        }}
      >
        {/* Fundo principal da tabela */}
        <Rect
          width={width}
          height={height}
          fill={surfaceBg}
          cornerRadius={10}
          shadowEnabled={!isCoarseOrMobileViewport()}
          shadowColor="rgba(15, 23, 42, 0.1)"
          shadowBlur={isSelected ? 14 : 6}
          shadowOffsetY={2}
          perfectDrawEnabled={false}
        />

        {/* Faixa de cabeçalho */}
        {hasHeader && rows.length > 0 && (
          <Rect
            width={width}
            height={TABLE_HEADER_HEIGHT}
            fill={headerBg}
            cornerRadius={[10, 10, 0, 0]}
            listening={false}
            perfectDrawEnabled={false}
          />
        )}

        {/* Células e textos interativos */}
        {rows.flatMap((row, rIdx) => {
          const cellY =
            rIdx === 0
              ? 0
              : TABLE_HEADER_HEIGHT + (rIdx - 1) * TABLE_ROW_HEIGHT;
          const cellH = rIdx === 0 ? TABLE_HEADER_HEIGHT : TABLE_ROW_HEIGHT;
          const isHeaderRow = hasHeader && rIdx === 0;
          const textY = Math.max(6, Math.round((cellH - fontSize * 1.15) / 2));

          return colWidths.map((colW, cIdx) => {
            const cellX = colOffsets[cIdx];
            const val = row[cIdx] ?? '';
            const isEditingThisCell =
              editingCell?.rowIdx === rIdx && editingCell?.colIdx === cIdx;
            const isActiveThisCell =
              isSelected &&
              !isEditingThisCell &&
              activeCell?.rowIdx === rIdx &&
              activeCell?.colIdx === cIdx;
            const showPlaceholder = isActiveThisCell && val.trim() === '' && canEdit && !element.locked;

            return (
              <Group
                key={`c_${rIdx}_${cIdx}`}
                x={cellX}
                y={cellY}
                onClick={(e) => {
                  if (isDraggingRef.current) return;
                  const now = Date.now();
                  const wasAlreadyActive =
                    isSelected &&
                    activeCell?.rowIdx === rIdx &&
                    activeCell?.colIdx === cIdx;

                  if (!isSelected) {
                    onSelect(e);
                  } else {
                    e.cancelBubble = true;
                  }

                  onSelectCell?.(element.id, rIdx, cIdx);

                  // Segundo clique na célula já destacada abre edição direta estilo planilha
                  if (wasAlreadyActive && now - lastCellClickTimeRef.current > 240) {
                    openCellEditor(rIdx, cIdx, cellX, cellY, colW, cellH, val);
                  }
                  lastCellClickTimeRef.current = now;
                }}
                onTap={(e) => {
                  if (isDraggingRef.current) return;
                  const wasAlreadyActive =
                    isSelected &&
                    activeCell?.rowIdx === rIdx &&
                    activeCell?.colIdx === cIdx;
                  if (!isSelected) {
                    onSelect(e);
                  } else {
                    e.cancelBubble = true;
                  }
                  onSelectCell?.(element.id, rIdx, cIdx);
                  if (wasAlreadyActive) {
                    openCellEditor(rIdx, cIdx, cellX, cellY, colW, cellH, val);
                  }
                }}
                onDblClick={(e) => {
                  if (!canEdit || element.locked || isDraggingRef.current) return;
                  e.cancelBubble = true;
                  openCellEditor(rIdx, cIdx, cellX, cellY, colW, cellH, val);
                }}
                onDblTap={(e) => {
                  if (!canEdit || element.locked || isDraggingRef.current) return;
                  e.cancelBubble = true;
                  openCellEditor(rIdx, cIdx, cellX, cellY, colW, cellH, val);
                }}
              >
                <Rect
                  width={colW}
                  height={cellH}
                  fill={
                    isActiveThisCell
                      ? isDark
                        ? 'rgba(56, 189, 248, 0.08)'
                        : 'rgba(2, 132, 199, 0.06)'
                      : !isHeaderRow && rIdx % 2 === 0
                        ? zebraBg
                        : 'rgba(0,0,0,0.001)'
                  }
                  perfectDrawEnabled={false}
                />
                <Text
                  text={showPlaceholder ? 'Digitar…' : val}
                  x={10}
                  y={textY}
                  width={Math.max(24, colW - 20)}
                  fontSize={showPlaceholder ? 11 : fontSize}
                  fontStyle={isHeaderRow ? 'bold' : showPlaceholder ? 'italic' : 'normal'}
                  fill={
                    showPlaceholder
                      ? textMuted
                      : isHeaderRow
                        ? headerTextColor
                        : textPrimary
                  }
                  fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                  ellipsis={true}
                  wrap="none"
                  visible={!isEditingThisCell}
                  listening={false}
                />
              </Group>
            );
          });
        })}

        {/* Linhas divisórias horizontais */}
        {rows.slice(1).map((_, idx) => {
          const lineY = TABLE_HEADER_HEIGHT + idx * TABLE_ROW_HEIGHT;
          return (
            <Line
              key={`hl_${idx}`}
              points={[0, lineY, width, lineY]}
              stroke={gridStroke}
              strokeWidth={1}
              listening={false}
              perfectDrawEnabled={false}
            />
          );
        })}

        {/* Linhas divisórias verticais */}
        {colOffsets.slice(1).map((lineX, idx) => (
          <Line
            key={`vl_${idx}`}
            points={[lineX, 0, lineX, height]}
            stroke={gridStroke}
            strokeWidth={1}
            listening={false}
            perfectDrawEnabled={false}
          />
        ))}

        {/* Borda externa */}
        <Rect
          width={width}
          height={height}
          stroke={activeBorder}
          strokeWidth={(isSelected && element.locked) || remoteSelector ? 2 : 1.2}
          cornerRadius={10}
          listening={false}
          perfectDrawEnabled={false}
        />

        {/* Anel de foco da célula selecionada estilo planilha */}
        {isSelected &&
          activeCell &&
          !(editingCell?.rowIdx === activeCell.rowIdx && editingCell?.colIdx === activeCell.colIdx) &&
          activeCell.rowIdx >= 0 &&
          activeCell.rowIdx < rows.length &&
          activeCell.colIdx >= 0 &&
          activeCell.colIdx < colWidths.length && (
            <Rect
              x={colOffsets[activeCell.colIdx] + 1}
              y={
                (activeCell.rowIdx === 0
                  ? 0
                  : TABLE_HEADER_HEIGHT + (activeCell.rowIdx - 1) * TABLE_ROW_HEIGHT) + 1
              }
              width={colWidths[activeCell.colIdx] - 2}
              height={
                (activeCell.rowIdx === 0 ? TABLE_HEADER_HEIGHT : TABLE_ROW_HEIGHT) - 2
              }
              stroke={userSelectionColor}
              strokeWidth={2}
              cornerRadius={activeCell.rowIdx === 0 ? 4 : 2}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

        {element.locked && <LockBadge x={width - 22} y={6} />}

        {/* Botões rápidos de + Linha e + Coluna quando selecionado */}
        {isSelected && canEdit && !element.locked && (
          <>
            {/* + Linha na borda inferior */}
            <Group
              ref={addRowGroupRef}
              x={0}
              y={height + 6}
              onClick={(e) => {
                e.cancelBubble = true;
                if (isDraggingRef.current) return;
                onCommitActiveEdit?.();
                const updates = addTableRow({ ...element, tableData: rows });
                onChange(updates);
                const newRowIdx = rows.length;
                onSelectCell?.(element.id, newRowIdx, 0);
                if (onEditCell && updates.tableData) {
                  const origin = getLiveOrigin();
                  const cellRect = getTableCellLocalRect(
                    { tableData: updates.tableData, tableColWidths: updates.tableColWidths },
                    newRowIdx,
                    0
                  );
                  requestAnimationFrame(() => {
                    onEditCell(
                      element.id,
                      newRowIdx,
                      0,
                      {
                        worldX: origin.x + cellRect.offsetX,
                        worldY: origin.y + cellRect.offsetY,
                        width: cellRect.width,
                        height: cellRect.height,
                      },
                      ''
                    );
                  });
                }
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                if (isDraggingRef.current) return;
                onCommitActiveEdit?.();
                const updates = addTableRow({ ...element, tableData: rows });
                onChange(updates);
                onSelectCell?.(element.id, rows.length, 0);
              }}
            >
              <Rect
                width={width}
                height={22}
                fill={isDark ? '#27272a' : '#f1f5f9'}
                stroke={gridStroke}
                strokeWidth={1}
                cornerRadius={6}
              />
              <Text
                text="+ Adicionar linha"
                width={width}
                y={5}
                align="center"
                fontSize={11}
                fontStyle="bold"
                fill={textPrimary}
                listening={false}
              />
            </Group>

            {/* + Coluna na borda direita */}
            <Group
              ref={addColGroupRef}
              x={width + 6}
              y={0}
              onClick={(e) => {
                e.cancelBubble = true;
                if (isDraggingRef.current) return;
                onCommitActiveEdit?.();
                const updates = addTableColumn({ ...element, tableData: rows });
                onChange(updates);
                const newColIdx = colWidths.length;
                onSelectCell?.(element.id, 0, newColIdx);
                if (onEditCell && updates.tableData) {
                  const origin = getLiveOrigin();
                  const cellRect = getTableCellLocalRect(
                    { tableData: updates.tableData, tableColWidths: updates.tableColWidths },
                    0,
                    newColIdx
                  );
                  requestAnimationFrame(() => {
                    onEditCell(
                      element.id,
                      0,
                      newColIdx,
                      {
                        worldX: origin.x + cellRect.offsetX,
                        worldY: origin.y + cellRect.offsetY,
                        width: cellRect.width,
                        height: cellRect.height,
                      },
                      cellRect.value
                    );
                  });
                }
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                if (isDraggingRef.current) return;
                onCommitActiveEdit?.();
                const updates = addTableColumn({ ...element, tableData: rows });
                onChange(updates);
                onSelectCell?.(element.id, 0, colWidths.length);
              }}
            >
              <Rect
                width={24}
                height={height}
                fill={isDark ? '#27272a' : '#f1f5f9'}
                stroke={gridStroke}
                strokeWidth={1}
                cornerRadius={6}
              />
              <Text
                text="+"
                width={24}
                y={Math.max(8, height / 2 - 8)}
                align="center"
                fontSize={15}
                fontStyle="bold"
                fill={textPrimary}
                listening={false}
              />
            </Group>
          </>
        )}
      </Group>
    );
  }
);

TableItem.displayName = 'TableItem';
