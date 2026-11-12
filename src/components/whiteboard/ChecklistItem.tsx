import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement, ChecklistItem as IChecklistItem } from '../../types/element';
import {
  computeChecklistProgress,
  computeChecklistHeight,
  createDefaultChecklistItems,
} from '../../utils/checklist';
import { getContrastTextColor } from '../../utils/colors';
import { playChimeSound, playReactionPopSound } from '../../utils/audioChime';
import { ElementReactionBadges } from './ElementReactionBadges';

interface ChecklistItemComponentProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  currentUserId?: string;
  mirioReactionUnlocked?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onStartEditingItem?: (
    elementId: string,
    target: 'title' | string,
    initialText: string,
    itemY: number
  ) => void;
  onCelebration?: (x: number, y: number) => void;
  onToggleReaction?: (elementId: string, emoji: string) => void;
  onOpenReactionPicker?: (
    elementId: string,
    anchor: { x: number; y: number },
    mode?: 'picker' | 'overflow'
  ) => void;
}

export const ChecklistItem: React.FC<ChecklistItemComponentProps> = React.memo(({
  element,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable = true,
  canEdit = true,
  currentUserId,
  mirioReactionUnlocked = false,
  onSelect,
  onChange,
  onStartEditingItem,
  onCelebration,
  onToggleReaction,
  onOpenReactionPicker,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const isDraggingRef = useRef(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [isHoveredLocal, setIsHoveredLocal] = useState(false);

  const items = useMemo<IChecklistItem[]>(() => {
    if (element.checklistItems && element.checklistItems.length > 0) {
      return element.checklistItems;
    }
    return createDefaultChecklistItems();
  }, [element.checklistItems]);

  const title = element.checklistTitle || 'Lista de Tarefas';
  const width = Math.max(220, element.width || 260);
  const requiredHeight = computeChecklistHeight(items.length);
  const height = Math.max(requiredHeight, element.height || 180);

  const { total, completed, percentage } = useMemo(
    () => computeChecklistProgress(items),
    [items]
  );

  const cardFill = element.fill || '#ffffff';
  const textColor = getContrastTextColor(cardFill, '#0f172a', '#f8fafc');
  const isDarkCard = textColor === '#f8fafc';

  // Alternar conclusão de uma tarefa
  const handleToggleItem = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, itemId: string) => {
      e.cancelBubble = true;
      if (!canEdit || isDraggingRef.current) return;

      const previousCompleted = items.filter((i) => i.completed).length;
      const updated = items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const newCompleted = updated.filter((i) => i.completed).length;
      const willBeAllDone = updated.length > 0 && newCompleted === updated.length && previousCompleted < updated.length;

      onChange({
        checklistItems: updated,
        height,
        updatedAt: Date.now(),
      });

      if (willBeAllDone) {
        playChimeSound();
        if (onCelebration) {
          onCelebration(element.x + width / 2, element.y + height / 2);
        }
      } else {
        playReactionPopSound();
      }
    },
    [canEdit, items, onChange, height, onCelebration, element.x, element.y, width]
  );

  // Excluir item individual
  const handleDeleteItem = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, itemId: string) => {
      e.cancelBubble = true;
      if (!canEdit || isDraggingRef.current) return;

      const updated = items.filter((item) => item.id !== itemId);
      const newItems = updated.length > 0 ? updated : createDefaultChecklistItems();
      const newHeight = computeChecklistHeight(newItems.length);

      onChange({
        checklistItems: newItems,
        height: newHeight,
        updatedAt: Date.now(),
      });
      playReactionPopSound();
    },
    [canEdit, items, onChange]
  );

  // Adicionar novo item
  const handleAddItem = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      if (!canEdit || isDraggingRef.current) return;

      const newItem: IChecklistItem = {
        id: 'chk_' + Math.random().toString(36).substring(2, 9),
        text: 'Nova tarefa',
        completed: false,
      };
      const updated = [...items, newItem];
      const newHeight = computeChecklistHeight(updated.length);

      onChange({
        checklistItems: updated,
        height: newHeight,
        updatedAt: Date.now(),
      });
      playReactionPopSound();

      if (onStartEditingItem) {
        const itemY = 56 + (updated.length - 1) * 34;
        onStartEditingItem(element.id, newItem.id, newItem.text, itemY);
      }
    },
    [canEdit, items, onChange, onStartEditingItem, element.id]
  );

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      draggable={draggable && !element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (!canEdit || !onStartEditingItem) return;
        onStartEditingItem(element.id, 'title', title, 16);
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (!canEdit || !onStartEditingItem) return;
        onStartEditingItem(element.id, 'title', title, 16);
      }}
      onMouseEnter={() => setIsHoveredLocal(true)}
      onMouseLeave={() => setIsHoveredLocal(false)}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={(e) => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 80);
        onChange({
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={() => {
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(220, Math.round(width * scaleX)),
          height: Math.max(requiredHeight, Math.round(height * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* Sombra e Corpo do Card */}
      <Rect
        width={width}
        height={height}
        cornerRadius={12}
        fill={cardFill}
        stroke={
          isSelected
            ? userSelectionColor
            : remoteSelector
            ? remoteSelector.color
            : isDarkCard
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.08)'
        }
        strokeWidth={isSelected ? 2 : 1}
        shadowColor="#000000"
        shadowBlur={16}
        shadowOpacity={isDarkCard ? 0.35 : 0.08}
        shadowOffsetY={4}
      />

      {/* Rótulo de seleção remota se outro usuário estiver selecionando */}
      {remoteSelector && !isSelected && (
        <Group x={0} y={-24}>
          <Rect
            height={20}
            cornerRadius={4}
            fill={remoteSelector.color}
            width={Math.max(60, remoteSelector.name.length * 8 + 12)}
          />
          <Text
            text={remoteSelector.name}
            fontSize={11}
            fontStyle="bold"
            fill="#ffffff"
            x={6}
            y={4}
          />
        </Group>
      )}

      {/* Ícone de Checklist no cabeçalho */}
      <Group x={16} y={16}>
        <Rect
          width={18}
          height={18}
          cornerRadius={4}
          fill={percentage === 100 ? '#10b981' : isDarkCard ? '#334155' : '#e2e8f0'}
        />
        <Line
          points={[4, 9, 8, 13, 14, 5]}
          stroke={percentage === 100 || isDarkCard ? '#ffffff' : '#64748b'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      </Group>

      {/* Título do Card */}
      <Text
        text={title}
        x={40}
        y={17}
        width={width - 120}
        fontSize={14}
        fontStyle="bold"
        fill={textColor}
        ellipsis={true}
        wrap="none"
        onDblClick={(e) => {
          e.cancelBubble = true;
          if (canEdit && onStartEditingItem) {
            onStartEditingItem(element.id, 'title', title, 16);
          }
        }}
      />

      {/* Pill Badge de Progresso */}
      <Group x={width - 76} y={14}>
        <Rect
          width={60}
          height={22}
          cornerRadius={11}
          fill={
            percentage === 100
              ? '#10b981'
              : isDarkCard
              ? 'rgba(255, 255, 255, 0.1)'
              : '#f1f5f9'
          }
        />
        <Text
          text={percentage === 100 ? '100% ✓' : `${completed}/${total}`}
          fontSize={11}
          fontStyle="bold"
          fill={
            percentage === 100
              ? '#ffffff'
              : isDarkCard
              ? '#94a3b8'
              : '#64748b'
          }
          width={60}
          align="center"
          y={5}
        />
      </Group>

      {/* Trilho da Barra de Progresso */}
      <Rect
        x={16}
        y={44}
        width={width - 32}
        height={3}
        cornerRadius={2}
        fill={isDarkCard ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}
      />

      {/* Preenchimento Dinâmico da Barra de Progresso */}
      {percentage > 0 && (
        <Rect
          x={16}
          y={44}
          width={Math.max(4, (width - 32) * (percentage / 100))}
          height={3}
          cornerRadius={2}
          fill={percentage === 100 ? '#10b981' : '#2563eb'}
        />
      )}

      {/* Lista de Itens do Checklist */}
      {items.map((item, index) => {
        const itemY = 56 + index * 34;
        const isHovered = hoveredItemId === item.id;

        return (
          <Group
            key={item.id}
            y={itemY}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            {/* Linha de fundo sutil no hover */}
            <Rect
              x={12}
              y={0}
              width={width - 24}
              height={30}
              cornerRadius={6}
              fill={
                isHovered
                  ? isDarkCard
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)'
                  : 'transparent'
              }
            />

            {/* Checkbox Clicável */}
            <Group
              x={16}
              y={6}
              onClick={(e) => handleToggleItem(e, item.id)}
              onTap={(e) => handleToggleItem(e, item.id)}
              cursor="pointer"
            >
              <Rect
                width={18}
                height={18}
                cornerRadius={4}
                fill={item.completed ? '#10b981' : isDarkCard ? '#1e293b' : '#ffffff'}
                stroke={
                  item.completed
                    ? '#10b981'
                    : isDarkCard
                    ? '#475569'
                    : '#cbd5e1'
                }
                strokeWidth={1.5}
              />
              {item.completed && (
                <Line
                  points={[4, 9, 7.5, 13, 14, 5]}
                  stroke="#ffffff"
                  strokeWidth={2}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </Group>

            {/* Texto do Item */}
            <Text
              text={item.text}
              x={42}
              y={8}
              width={width - 74}
              fontSize={13}
              fill={
                item.completed
                  ? isDarkCard
                    ? '#64748b'
                    : '#94a3b8'
                  : textColor
              }
              textDecoration={item.completed ? 'line-through' : ''}
              ellipsis={true}
              wrap="none"
              onDblClick={(e) => {
                e.cancelBubble = true;
                if (canEdit && onStartEditingItem) {
                  onStartEditingItem(element.id, item.id, item.text, itemY);
                }
              }}
              onDblTap={(e) => {
                e.cancelBubble = true;
                if (canEdit && onStartEditingItem) {
                  onStartEditingItem(element.id, item.id, item.text, itemY);
                }
              }}
            />

            {/* Botão de Excluir Item no Hover */}
            {isHovered && canEdit && items.length > 1 && (
              <Group
                x={width - 34}
                y={6}
                onClick={(e) => handleDeleteItem(e, item.id)}
                onTap={(e) => handleDeleteItem(e, item.id)}
                cursor="pointer"
              >
                <Rect
                  width={18}
                  height={18}
                  cornerRadius={4}
                  fill={isDarkCard ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
                />
                <Text
                  text="×"
                  x={0}
                  y={1}
                  width={18}
                  fontSize={14}
                  fontStyle="bold"
                  align="center"
                  fill={isDarkCard ? '#cbd5e1' : '#64748b'}
                />
              </Group>
            )}
          </Group>
        );
      })}

      {/* Botão de Rodapé "+ Adicionar tarefa" */}
      {canEdit && (
        <Group
          y={56 + items.length * 34 + 4}
          onClick={handleAddItem}
          onTap={handleAddItem}
          onMouseEnter={() => setIsAddHovered(true)}
          onMouseLeave={() => setIsAddHovered(false)}
          cursor="pointer"
        >
          <Rect
            x={16}
            y={0}
            width={width - 32}
            height={26}
            cornerRadius={6}
            fill={
              isAddHovered
                ? isDarkCard
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.04)'
                : 'transparent'
            }
            stroke={isDarkCard ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}
            strokeWidth={1}
            dash={[3, 3]}
          />
          <Text
            text="+ Adicionar tarefa"
            x={16}
            y={6}
            width={width - 32}
            fontSize={12}
            fontStyle="500"
            align="center"
            fill={isDarkCard ? '#94a3b8' : '#64748b'}
          />
        </Group>
      )}

      {/* Badges de reações estilo Miro ancorados na borda inferior */}
      <ElementReactionBadges
        element={element}
        localLeftX={0}
        localBottomY={height}
        availableWidth={width}
        currentUserId={currentUserId}
        canEdit={canEdit}
        mirioReactionUnlocked={mirioReactionUnlocked}
        isHovered={isHoveredLocal}
        onToggleReaction={onToggleReaction}
        onOpenReactionPicker={onOpenReactionPicker}
      />
    </Group>
  );
});

ChecklistItem.displayName = 'ChecklistItem';
