import React, { useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface StickyNoteItemProps {
  element: CanvasElement;
  isSelected: boolean;
  remoteSelector?: { name: string; color: string };
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onStartEditing: (id: string, x: number, y: number, width: number, height: number, text: string) => void;
}

export const StickyNoteItem: React.FC<StickyNoteItemProps> = ({
  element,
  isSelected,
  remoteSelector,
  onSelect,
  onChange,
  onStartEditing,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const width = element.width || 180;
  const height = element.height || 180;
  const fill = element.fill || '#fff9b1';

  const handleDblClick = () => {
    if (groupRef.current) {
      onStartEditing(
        element.id,
        element.x,
        element.y,
        width,
        height,
        element.text || ''
      );
    }
  };

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
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
          width: Math.max(80, Math.round(width * scaleX)),
          height: Math.max(80, Math.round(height * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* Sombra sutil e corpo do Post-it */}
      <Rect
        width={width}
        height={height}
        fill={fill}
        cornerRadius={8}
        shadowColor="rgba(0, 0, 0, 0.12)"
        shadowBlur={10}
        shadowOffset={{ x: 2, y: 4 }}
        shadowOpacity={0.8}
        stroke={
          remoteSelector
            ? remoteSelector.color
            : isSelected
            ? '#2563eb'
            : 'rgba(0,0,0,0.06)'
        }
        strokeWidth={remoteSelector ? 2.5 : isSelected ? 2 : 1}
      />

      {/* Conteúdo textual do Post-it */}
      <Text
        text={element.text || 'Clique 2x para editar...'}
        width={width - 24}
        height={height - 24}
        x={12}
        y={12}
        fontSize={16}
        fontFamily="sans-serif"
        fill={element.text ? '#1e293b' : '#94a3b8'}
        wrap="word"
        align="left"
        verticalAlign="top"
        lineHeight={1.3}
      />

      {/* Tag do colega que está com o elemento selecionado */}
      {remoteSelector && (
        <Group x={0} y={-24}>
          <Rect
            fill={remoteSelector.color}
            height={20}
            width={Math.max(60, remoteSelector.name.length * 9)}
            cornerRadius={[4, 4, 0, 0]}
          />
          <Text
            text={remoteSelector.name}
            fill="#ffffff"
            fontSize={11}
            fontStyle="bold"
            x={6}
            y={4}
          />
        </Group>
      )}
    </Group>
  );
};
