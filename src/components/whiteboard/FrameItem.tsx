import React, { useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { isCoarseOrMobileViewport } from '../../utils/viewport';

interface FrameItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onStartEditing?: (id: string, x: number, y: number, width: number, height: number, text: string) => void;
}

export const FrameItem: React.FC<FrameItemProps> = React.memo(({
  element,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable,
  canEdit = true,
  onSelect,
  onChange,
  onStartEditing,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const width = element.width || 420;
  const height = element.height || 500;
  
  // O tema da raia mantém sua cor de identidade mesmo quando selecionada
  const themeColor = element.stroke || '#94a3b8';
  const fillColor = element.fill || 'rgba(241, 245, 249, 0.45)';
  const title = element.text || 'Nova Raia';
  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;

  const handleDblClick = () => {
    if (!canEdit) return;
    if (onStartEditing) {
      onStartEditing(element.id, element.x, element.y - 28, Math.min(width, 260), 32, title);
    }
  };

  const headerWidth = Math.min(width, Math.max(130, title.length * 9 + 36));

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={isItemDraggable}
      onDragEnd={(e) => {
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
          width: Math.max(160, Math.round(width * scaleX)),
          height: Math.max(120, Math.round(height * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* 1. Halo / Anel Externo de Seleção (Colaborador Remoto ou Seleção Ativa) */}
      {(isSelected || remoteSelector) && (
        <Rect
          x={-3}
          y={-3}
          width={width + 6}
          height={height + 6}
          stroke={remoteSelector ? remoteSelector.color : userSelectionColor}
          strokeWidth={2}
          dash={[5, 3]}
          cornerRadius={14}
          listening={false}
        />
      )}

      {/* 2. Fundo e contorno da Moldura / Raia com o Tema Selecionado */}
      <Rect
        width={width}
        height={height}
        fill={fillColor}
        stroke={themeColor}
        strokeWidth={element.strokeWidth || 2}
        dash={[8, 5]}
        cornerRadius={12}
        onClick={onSelect}
        onTap={onSelect}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />

      {/* 3. Aba superior da Raia com o Tema de Cor correspondente */}
      <Group
        y={-28}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
      >
        <Rect
          width={headerWidth}
          height={28}
          fill={themeColor}
          cornerRadius={[8, 8, 0, 0]}
          shadowEnabled={!isCoarseOrMobileViewport()}
          shadowColor="rgba(0,0,0,0.12)"
          shadowBlur={4}
          shadowOffset={{ x: 0, y: 1 }}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
        <Text
          text={title}
          x={12}
          y={7}
          fontSize={13}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#ffffff"
          width={headerWidth - 28}
          ellipsis={true}
          wrap="none"
          listening={false}
        />
        {element.locked && (
          <Text
            text="🔒"
            x={headerWidth - 20}
            y={7}
            fontSize={12}
            listening={false}
          />
        )}
      </Group>

      {/* Tag do usuário remoto que está interagindo com a moldura */}
      {remoteSelector && (
        <Group y={height + 6} listening={false}>
          <Rect
            width={remoteSelector.name.length * 8 + 16}
            height={20}
            fill={remoteSelector.color}
            cornerRadius={4}
            listening={false}
          />
          <Text
            text={remoteSelector.name}
            x={8}
            y={4}
            fontSize={11}
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

FrameItem.displayName = 'FrameItem';
