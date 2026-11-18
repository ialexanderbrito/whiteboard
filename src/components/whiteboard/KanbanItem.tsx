import React, { useRef, useState } from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement, KanbanColumnItem } from '../../types/element';
import {
  createDefaultKanbanColumns,
  computeKanbanDimensions,
  addCardToKanbanColumn,
  moveKanbanCardBetweenColumns,
  reorderOrMoveKanbanCard,
  resolveKanbanDropTarget,
  getKanbanFieldLocalRect,
  KANBAN_COL_WIDTH,
  KANBAN_COL_GAP,
  KANBAN_PADDING,
  KANBAN_TOP_BAR_HEIGHT,
  KANBAN_COL_HEADER_HEIGHT,
  KANBAN_CARD_HEIGHT,
  KANBAN_CARD_GAP,
  type KanbanEditableTarget,
} from '../../utils/tableAndKanban';
import { isCoarseOrMobileViewport } from '../../utils/viewport';
import { LockBadge } from './LockBadge';

interface KanbanItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  isDark?: boolean;
  activeEditingTarget?: KanbanEditableTarget | null;
  onCommitActiveEdit?: () => KanbanColumnItem[] | null;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onEditKanbanField?: (
    elementId: string,
    target: KanbanEditableTarget,
    rect: { worldX: number; worldY: number; width: number; height: number },
    currentValue: string,
    fallbackColumns?: KanbanColumnItem[]
  ) => void;
}

interface ActiveCardDragState {
  cardId: string;
  cardTitle: string;
  cardCompleted?: boolean;
  fromColIdx: number;
  fromCardIdx: number;
  localX: number;
  localY: number;
  toColIdx: number;
  toCardIdx: number;
}

export const KanbanItem: React.FC<KanbanItemProps> = React.memo(
  ({
    element,
    isSelected,
    userSelectionColor = '#0284c7',
    remoteSelector,
    draggable = true,
    canEdit = true,
    isDark = false,
    activeEditingTarget = null,
    onCommitActiveEdit,
    onSelect,
    onChange,
    onEditKanbanField,
  }) => {
    const groupRef = useRef<Konva.Group>(null);
    const ghostCardRef = useRef<Konva.Group>(null);
    const isDraggingInteractionRef = useRef(false);
    const renderPosRef = useRef({ x: element.x, y: element.y });
    const [dragCardState, setDragCardState] = useState<ActiveCardDragState | null>(null);

    if (!isDraggingInteractionRef.current && !groupRef.current?.isDragging()) {
      renderPosRef.current = { x: element.x, y: element.y };
    }

    const columns =
      element.kanbanColumns && element.kanbanColumns.length > 0
        ? element.kanbanColumns
        : createDefaultKanbanColumns();
    const { width, height } = computeKanbanDimensions(columns);
    const boardTitle = element.kanbanTitle || 'Quadro Kanban';

    const frameBg = isDark ? '#18181b' : '#f8fafc';
    const colBg = isDark ? '#27272a' : '#eff3f8';
    const cardBg = isDark ? '#1f1f23' : '#ffffff';
    const borderCol = isDark ? '#3f3f46' : '#cbd5e1';
    const textMain = isDark ? '#f4f4f5' : '#0f172a';
    const textMuted = isDark ? '#a1a1aa' : '#64748b';
    const activeStroke = remoteSelector
      ? remoteSelector.color
      : isSelected
        ? userSelectionColor
        : borderCol;

    const canManipulateCards = draggable && canEdit && !element.locked;

    const getLiveBoardOrigin = () => ({
      x: groupRef.current ? Math.round(groupRef.current.x()) : element.x,
      y: groupRef.current ? Math.round(groupRef.current.y()) : element.y,
    });

    const openFieldEditor = (
      target: KanbanEditableTarget,
      currentValue: string,
      colsForLayout: KanbanColumnItem[] = columns
    ) => {
      if (!canEdit || element.locked || !onEditKanbanField) return;
      const origin = getLiveBoardOrigin();
      const localRect = getKanbanFieldLocalRect(colsForLayout, target);
      onEditKanbanField(
        element.id,
        target,
        {
          worldX: origin.x + localRect.offsetX,
          worldY: origin.y + localRect.offsetY,
          width: localRect.width,
          height: localRect.height,
        },
        currentValue,
        colsForLayout
      );
    };

    const handleToggleCardComplete = (colId: string, cardId: string) => {
      if (!canEdit || element.locked || isDraggingInteractionRef.current) return;
      const baseCols = onCommitActiveEdit?.() || columns;
      const nextCols = baseCols.map((col) =>
        col.id === colId
          ? {
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId ? { ...c, completed: !c.completed } : c
              ),
            }
          : col
      );
      onChange({ kanbanColumns: nextCols });
    };

    const handleDeleteCard = (colId: string, cardId: string) => {
      if (!canEdit || element.locked || isDraggingInteractionRef.current) return;
      const baseCols = onCommitActiveEdit?.() || columns;
      const nextCols = baseCols.map((col) =>
        col.id === colId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col
      );
      const dims = computeKanbanDimensions(nextCols);
      onChange({ kanbanColumns: nextCols, width: dims.width, height: dims.height });
    };

    const handleAddCard = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
      colId: string
    ) => {
      e.cancelBubble = true;
      if (!canEdit || element.locked || isDraggingInteractionRef.current) return;

      const baseCols = onCommitActiveEdit?.() || columns;
      const added = addCardToKanbanColumn(baseCols, colId, 'Nova tarefa');
      onChange({
        kanbanColumns: added.columns,
        width: added.width,
        height: added.height,
      });

      if (!isSelected) {
        onSelect(e);
      }

      if (onEditKanbanField) {
        const origin = getLiveBoardOrigin();
        const localRect = getKanbanFieldLocalRect(added.columns, {
          kind: 'card',
          colId,
          cardId: added.newCardId,
        });
        requestAnimationFrame(() => {
          onEditKanbanField(
            element.id,
            { kind: 'card', colId, cardId: added.newCardId },
            {
              worldX: origin.x + localRect.offsetX,
              worldY: origin.y + localRect.offsetY,
              width: localRect.width,
              height: localRect.height,
            },
            'Nova tarefa',
            added.columns
          );
        });
      }
    };

    const isEditingBoardTitle = activeEditingTarget?.kind === 'boardTitle';

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
          if (isDraggingInteractionRef.current) return;
          onSelect(e);
        }}
        onTap={(e) => {
          if (isDraggingInteractionRef.current) return;
          onSelect(e);
        }}
        onDragStart={(e) => {
          if ((e.target as Konva.Node) !== groupRef.current) return;
          isDraggingInteractionRef.current = true;
          onCommitActiveEdit?.();
        }}
        onDragEnd={(e) => {
          if ((e.target as Konva.Node) !== groupRef.current) return;
          setTimeout(() => {
            isDraggingInteractionRef.current = false;
          }, 60);
          onChange({
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y()),
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width,
            height,
            rotation: Math.round(node.rotation()),
          });
        }}
      >
        {/* Container externo do Kanban */}
        <Rect
          width={width}
          height={height}
          fill={frameBg}
          stroke={activeStroke}
          strokeWidth={isSelected || remoteSelector ? 2 : 1.2}
          cornerRadius={14}
          shadowEnabled={!isCoarseOrMobileViewport()}
          shadowColor="rgba(15, 23, 42, 0.12)"
          shadowBlur={isSelected ? 16 : 8}
          shadowOffsetY={3}
          perfectDrawEnabled={false}
        />

        {/* Barra de Título do Kanban */}
        <Group
          x={KANBAN_PADDING}
          y={12}
          onDblClick={(e) => {
            if (!canEdit || element.locked) return;
            e.cancelBubble = true;
            openFieldEditor({ kind: 'boardTitle' }, boardTitle);
          }}
          onDblTap={(e) => {
            if (!canEdit || element.locked) return;
            e.cancelBubble = true;
            openFieldEditor({ kind: 'boardTitle' }, boardTitle);
          }}
        >
          <Rect
            width={Math.max(140, width - KANBAN_PADDING * 2)}
            height={24}
            fill="rgba(0,0,0,0.001)"
            perfectDrawEnabled={false}
          />
          <Text
            text={boardTitle}
            fontSize={15}
            fontStyle="bold"
            fill={textMain}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
            visible={!isEditingBoardTitle}
            listening={false}
          />
        </Group>

        {element.locked && <LockBadge x={width - 26} y={10} />}

        {/* Colunas do Kanban */}
        {columns.map((col, colIdx) => {
          const colX = KANBAN_PADDING + colIdx * (KANBAN_COL_WIDTH + KANBAN_COL_GAP);
          const colY = KANBAN_TOP_BAR_HEIGHT;
          const colH = height - KANBAN_TOP_BAR_HEIGHT - KANBAN_PADDING;
          const isEditingThisColumn =
            activeEditingTarget?.kind === 'column' && activeEditingTarget.colId === col.id;
          const isDropTargetCol = dragCardState !== null && dragCardState.toColIdx === colIdx;
          const dropLineY =
            KANBAN_COL_HEADER_HEIGHT +
            (dragCardState?.toCardIdx ?? 0) * (KANBAN_CARD_HEIGHT + KANBAN_CARD_GAP) -
            Math.round(KANBAN_CARD_GAP / 2);

          return (
            <Group key={col.id} x={colX} y={colY}>
              <Rect
                width={KANBAN_COL_WIDTH}
                height={colH}
                fill={colBg}
                stroke={isDropTargetCol ? userSelectionColor : 'transparent'}
                strokeWidth={isDropTargetCol ? 1.6 : 0}
                cornerRadius={10}
                perfectDrawEnabled={false}
              />

              {/* Cabeçalho da coluna */}
              <Group
                onDblClick={(e) => {
                  if (!canEdit || element.locked) return;
                  e.cancelBubble = true;
                  openFieldEditor({ kind: 'column', colId: col.id }, col.title);
                }}
                onDblTap={(e) => {
                  if (!canEdit || element.locked) return;
                  e.cancelBubble = true;
                  openFieldEditor({ kind: 'column', colId: col.id }, col.title);
                }}
              >
                <Rect
                  width={KANBAN_COL_WIDTH}
                  height={KANBAN_COL_HEADER_HEIGHT}
                  fill="rgba(0,0,0,0.001)"
                  perfectDrawEnabled={false}
                />
                <Circle
                  x={15}
                  y={18}
                  radius={4.5}
                  fill={col.color || '#3b82f6'}
                  listening={false}
                />
                <Text
                  text={col.title}
                  x={26}
                  y={11}
                  width={KANBAN_COL_WIDTH - 62}
                  fontSize={12}
                  fontStyle="bold"
                  fill={textMain}
                  fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                  ellipsis={true}
                  wrap="none"
                  visible={!isEditingThisColumn}
                  listening={false}
                />
                <Text
                  text={String(col.cards.length)}
                  x={KANBAN_COL_WIDTH - 32}
                  y={11}
                  width={22}
                  align="right"
                  fontSize={11}
                  fontStyle="bold"
                  fill={textMuted}
                  listening={false}
                />
              </Group>

              {/* Indicador visual da posição de soltura durante arrasto de card */}
              {isDropTargetCol && (
                <Line
                  points={[10, dropLineY, KANBAN_COL_WIDTH - 10, dropLineY]}
                  stroke={userSelectionColor}
                  strokeWidth={2.5}
                  lineCap="round"
                  listening={false}
                  perfectDrawEnabled={false}
                />
              )}

              {/* Cartões da coluna */}
              {col.cards.map((card, cardIdx) => {
                const cardY =
                  KANBAN_COL_HEADER_HEIGHT + cardIdx * (KANBAN_CARD_HEIGHT + KANBAN_CARD_GAP);
                const isEditingThisCard =
                  activeEditingTarget?.kind === 'card' &&
                  activeEditingTarget.colId === col.id &&
                  activeEditingTarget.cardId === card.id;
                const isBeingDragged = dragCardState?.cardId === card.id;

                return (
                  <Group key={card.id}>
                    {/* Slot tracejado na posição de origem enquanto o card é arrastado */}
                    {isBeingDragged && (
                      <Rect
                        x={8}
                        y={cardY}
                        width={KANBAN_COL_WIDTH - 16}
                        height={KANBAN_CARD_HEIGHT}
                        cornerRadius={8}
                        fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'}
                        stroke={userSelectionColor}
                        strokeWidth={1.2}
                        dash={[5, 4]}
                        listening={false}
                        perfectDrawEnabled={false}
                      />
                    )}

                    <Group
                      x={8}
                      y={cardY}
                      opacity={isBeingDragged ? 0.01 : 1}
                      draggable={canManipulateCards && !isEditingThisCard}
                      dragDistance={5}
                      onDblClick={(e) => {
                        if (!canEdit || element.locked || isDraggingInteractionRef.current) return;
                        e.cancelBubble = true;
                        const baseCols = onCommitActiveEdit?.() || columns;
                        const latestCard =
                          baseCols
                            .find((c) => c.id === col.id)
                            ?.cards.find((item) => item.id === card.id) || card;
                        openFieldEditor(
                          { kind: 'card', colId: col.id, cardId: card.id },
                          latestCard.title,
                          baseCols
                        );
                      }}
                      onDblTap={(e) => {
                        if (!canEdit || element.locked || isDraggingInteractionRef.current) return;
                        e.cancelBubble = true;
                        const baseCols = onCommitActiveEdit?.() || columns;
                        const latestCard =
                          baseCols
                            .find((c) => c.id === col.id)
                            ?.cards.find((item) => item.id === card.id) || card;
                        openFieldEditor(
                          { kind: 'card', colId: col.id, cardId: card.id },
                          latestCard.title,
                          baseCols
                        );
                      }}
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                        isDraggingInteractionRef.current = true;
                        onCommitActiveEdit?.();
                        if (!isSelected) {
                          onSelect(e);
                        }
                        const startLocalX = colX + e.target.x();
                        const startLocalY = colY + e.target.y();
                        setDragCardState({
                          cardId: card.id,
                          cardTitle: card.title,
                          cardCompleted: card.completed,
                          fromColIdx: colIdx,
                          fromCardIdx: cardIdx,
                          localX: startLocalX,
                          localY: startLocalY,
                          toColIdx: colIdx,
                          toCardIdx: cardIdx,
                        });
                      }}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const curLocalX = colX + e.target.x();
                        const curLocalY = colY + e.target.y();
                        if (ghostCardRef.current) {
                          ghostCardRef.current.position({ x: curLocalX, y: curLocalY });
                          ghostCardRef.current.getLayer()?.batchDraw();
                        }
                        const centerX = curLocalX + (KANBAN_COL_WIDTH - 16) / 2;
                        const centerY = curLocalY + KANBAN_CARD_HEIGHT / 2;
                        const drop = resolveKanbanDropTarget(columns, colIdx, centerX, centerY);
                        setDragCardState((prev) => {
                          if (!prev) return prev;
                          if (
                            prev.toColIdx === drop.toColIdx &&
                            prev.toCardIdx === drop.toCardIdx
                          ) {
                            return prev;
                          }
                          return {
                            ...prev,
                            localX: curLocalX,
                            localY: curLocalY,
                            toColIdx: drop.toColIdx,
                            toCardIdx: drop.toCardIdx,
                          };
                        });
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        const finalLocalX = colX + e.target.x();
                        const finalLocalY = colY + e.target.y();
                        e.target.position({ x: 8, y: cardY });

                        const centerX = finalLocalX + (KANBAN_COL_WIDTH - 16) / 2;
                        const centerY = finalLocalY + KANBAN_CARD_HEIGHT / 2;
                        const baseCols = onCommitActiveEdit?.() || columns;
                        const drop = resolveKanbanDropTarget(baseCols, colIdx, centerX, centerY);

                        setDragCardState(null);
                        setTimeout(() => {
                          isDraggingInteractionRef.current = false;
                        }, 60);

                        const moved = reorderOrMoveKanbanCard(
                          baseCols,
                          colIdx,
                          card.id,
                          drop.toColIdx,
                          drop.toCardIdx
                        );
                        if (moved) {
                          onChange({
                            kanbanColumns: moved.columns,
                            width: moved.width,
                            height: moved.height,
                          });
                        }
                      }}
                    >
                      <Rect
                        width={KANBAN_COL_WIDTH - 16}
                        height={KANBAN_CARD_HEIGHT}
                        fill={cardBg}
                        stroke={isEditingThisCard ? userSelectionColor : borderCol}
                        strokeWidth={isEditingThisCard ? 1.5 : 1}
                        cornerRadius={8}
                        perfectDrawEnabled={false}
                      />

                      {/* Checkbox interativo de conclusão */}
                      <Group
                        x={10}
                        y={12}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          handleToggleCardComplete(col.id, card.id);
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          handleToggleCardComplete(col.id, card.id);
                        }}
                        onDblClick={(e) => {
                          e.cancelBubble = true;
                        }}
                        onDblTap={(e) => {
                          e.cancelBubble = true;
                        }}
                      >
                        <Rect
                          width={15}
                          height={15}
                          cornerRadius={4}
                          fill={card.completed ? '#10b981' : 'transparent'}
                          stroke={card.completed ? '#10b981' : textMuted}
                          strokeWidth={1.4}
                        />
                        {card.completed && (
                          <Text
                            text="✓"
                            x={2.5}
                            y={1.5}
                            fontSize={10}
                            fontStyle="bold"
                            fill="#ffffff"
                            listening={false}
                          />
                        )}
                      </Group>

                      {/* Título do card */}
                      <Text
                        text={card.title}
                        x={31}
                        y={11}
                        width={KANBAN_COL_WIDTH - 66}
                        height={34}
                        fontSize={12}
                        fill={card.completed ? textMuted : textMain}
                        textDecoration={card.completed ? 'line-through' : ''}
                        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                        ellipsis={true}
                        visible={!isEditingThisCard}
                        listening={false}
                      />

                      {/* Setas rápidas ← / → e × para mover card entre colunas quando Kanban está selecionado */}
                      {isSelected && canEdit && !element.locked && !isEditingThisCard && (
                        <Group
                          x={KANBAN_COL_WIDTH - 62}
                          y={35}
                          onDblClick={(e) => {
                            e.cancelBubble = true;
                          }}
                          onDblTap={(e) => {
                            e.cancelBubble = true;
                          }}
                        >
                          {colIdx > 0 && (
                            <Text
                              text="←"
                              x={0}
                              y={0}
                              width={14}
                              fontSize={11}
                              fontStyle="bold"
                              fill={textMuted}
                              onClick={(e) => {
                                e.cancelBubble = true;
                                if (isDraggingInteractionRef.current) return;
                                const baseCols = onCommitActiveEdit?.() || columns;
                                const moved = moveKanbanCardBetweenColumns(
                                  baseCols,
                                  colIdx,
                                  card.id,
                                  -1
                                );
                                if (moved) {
                                  onChange({
                                    kanbanColumns: moved.columns,
                                    width: moved.width,
                                    height: moved.height,
                                  });
                                }
                              }}
                              onTap={(e) => {
                                e.cancelBubble = true;
                                if (isDraggingInteractionRef.current) return;
                                const baseCols = onCommitActiveEdit?.() || columns;
                                const moved = moveKanbanCardBetweenColumns(
                                  baseCols,
                                  colIdx,
                                  card.id,
                                  -1
                                );
                                if (moved) {
                                  onChange({
                                    kanbanColumns: moved.columns,
                                    width: moved.width,
                                    height: moved.height,
                                  });
                                }
                              }}
                            />
                          )}
                          {colIdx < columns.length - 1 && (
                            <Text
                              text="→"
                              x={16}
                              y={0}
                              width={14}
                              fontSize={11}
                              fontStyle="bold"
                              fill={textMuted}
                              onClick={(e) => {
                                e.cancelBubble = true;
                                if (isDraggingInteractionRef.current) return;
                                const baseCols = onCommitActiveEdit?.() || columns;
                                const moved = moveKanbanCardBetweenColumns(
                                  baseCols,
                                  colIdx,
                                  card.id,
                                  1
                                );
                                if (moved) {
                                  onChange({
                                    kanbanColumns: moved.columns,
                                    width: moved.width,
                                    height: moved.height,
                                  });
                                }
                              }}
                              onTap={(e) => {
                                e.cancelBubble = true;
                                if (isDraggingInteractionRef.current) return;
                                const baseCols = onCommitActiveEdit?.() || columns;
                                const moved = moveKanbanCardBetweenColumns(
                                  baseCols,
                                  colIdx,
                                  card.id,
                                  1
                                );
                                if (moved) {
                                  onChange({
                                    kanbanColumns: moved.columns,
                                    width: moved.width,
                                    height: moved.height,
                                  });
                                }
                              }}
                            />
                          )}
                          <Text
                            text="×"
                            x={32}
                            y={-1}
                            width={14}
                            fontSize={12}
                            fontStyle="bold"
                            fill={textMuted}
                            onClick={(e) => {
                              e.cancelBubble = true;
                              handleDeleteCard(col.id, card.id);
                            }}
                            onTap={(e) => {
                              e.cancelBubble = true;
                              handleDeleteCard(col.id, card.id);
                            }}
                          />
                        </Group>
                      )}
                    </Group>
                  </Group>
                );
              })}

              {/* Botão + Novo card no rodapé da coluna */}
              {canEdit && !element.locked && (
                <Group
                  x={8}
                  y={
                    KANBAN_COL_HEADER_HEIGHT +
                    col.cards.length * (KANBAN_CARD_HEIGHT + KANBAN_CARD_GAP) +
                    2
                  }
                  onClick={(e) => handleAddCard(e, col.id)}
                  onTap={(e) => handleAddCard(e, col.id)}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                  }}
                >
                  <Rect
                    width={KANBAN_COL_WIDTH - 16}
                    height={28}
                    cornerRadius={7}
                    fill={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)'}
                  />
                  <Text
                    text="+ Novo card"
                    width={KANBAN_COL_WIDTH - 16}
                    y={8}
                    align="center"
                    fontSize={11}
                    fontStyle="bold"
                    fill={textMuted}
                    listening={false}
                  />
                </Group>
              )}
            </Group>
          );
        })}

        {/* Cartão flutuante elevado renderizado no topo absoluto durante o arraste */}
        {dragCardState && (
          <Group
            ref={ghostCardRef}
            x={dragCardState.localX}
            y={dragCardState.localY}
            rotation={-1.5}
            listening={false}
          >
            <Rect
              width={KANBAN_COL_WIDTH - 16}
              height={KANBAN_CARD_HEIGHT}
              fill={cardBg}
              stroke={userSelectionColor}
              strokeWidth={2}
              cornerRadius={8}
              shadowEnabled={true}
              shadowColor="rgba(15, 23, 42, 0.28)"
              shadowBlur={18}
              shadowOffsetY={6}
              perfectDrawEnabled={false}
            />
            <Rect
              x={10}
              y={12}
              width={15}
              height={15}
              cornerRadius={4}
              fill={dragCardState.cardCompleted ? '#10b981' : 'transparent'}
              stroke={dragCardState.cardCompleted ? '#10b981' : textMuted}
              strokeWidth={1.4}
            />
            {dragCardState.cardCompleted && (
              <Text
                text="✓"
                x={12.5}
                y={13.5}
                fontSize={10}
                fontStyle="bold"
                fill="#ffffff"
              />
            )}
            <Text
              text={dragCardState.cardTitle}
              x={31}
              y={11}
              width={KANBAN_COL_WIDTH - 52}
              height={34}
              fontSize={12}
              fontStyle="bold"
              fill={dragCardState.cardCompleted ? textMuted : textMain}
              fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              ellipsis={true}
            />
          </Group>
        )}
      </Group>
    );
  }
);

KanbanItem.displayName = 'KanbanItem';
