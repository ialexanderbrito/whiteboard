import React, { useRef } from 'react';
import { Group, Text, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface TextItemProps {
  element: CanvasElement;
  isSelected: boolean;
  remoteSelector?: { name: string; color: string };
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onStartEditing: (id: string, x: number, y: number, width: number, height: number, text: string) => void;
}

export const TextItem: React.FC<TextItemProps> = ({
  element,
  isSelected,
  remoteSelector,
  onSelect,
  onChange,
  onStartEditing,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const text = element.text || 'Texto';
  const fontSize = element.fontSize || 20;
  const fill = element.fill || '#0f172a';
  const width = element.width || 200;

  const handleDblClick = () => {
    onStartEditing(
      element.id,
      element.x,
      element.y,
      width,
      fontSize * 2,
      text
    );
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
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(60, Math.round(width * scaleX)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      <Text
        text={text}
        fontSize={fontSize}
        fontFamily="sans-serif"
        fill={fill}
        width={width}
        wrap="word"
        lineHeight={1.3}
        stroke={isSelected ? '#3b82f6' : undefined}
        strokeWidth={isSelected ? 0.5 : 0}
      />

      {remoteSelector && (
        <Group x={0} y={-22}>
          <Rect
            fill={remoteSelector.color}
            height={18}
            width={Math.max(60, remoteSelector.name.length * 8.5)}
            cornerRadius={[4, 4, 0, 0]}
          />
          <Text
            text={remoteSelector.name}
            fill="#ffffff"
            fontSize={11}
            fontStyle="bold"
            x={6}
            y={3}
          />
        </Group>
      )}
    </Group>
  );
};
