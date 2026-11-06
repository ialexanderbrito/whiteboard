import React, { useRef } from 'react';
import { Group, Arrow, Line, Text, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface ArrowItemProps {
  element: CanvasElement;
  isSelected: boolean;
  remoteSelector?: { name: string; color: string };
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

export const ArrowItem: React.FC<ArrowItemProps> = ({
  element,
  isSelected,
  remoteSelector,
  onSelect,
  onChange,
}) => {
  const lineRef = useRef<Konva.Group>(null);
  const points = element.points && element.points.length >= 4 ? element.points : [0, 0, 150, 100];
  const stroke = element.stroke || '#2563eb';
  const strokeWidth = element.strokeWidth || 3;
  const isLine = element.type === 'line';

  return (
    <Group
      ref={lineRef}
      id={element.id}
      x={element.x}
      y={element.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={() => {
        const node = lineRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        const scaledPoints = points.map((p, idx) => (idx % 2 === 0 ? p * scaleX : p * scaleY));

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          points: scaledPoints,
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {isLine ? (
        <Line
          points={points}
          stroke={remoteSelector ? remoteSelector.color : isSelected ? '#3b82f6' : stroke}
          strokeWidth={remoteSelector ? 4 : isSelected ? 4 : strokeWidth}
          hitStrokeWidth={16}
          lineCap="round"
          lineJoin="round"
        />
      ) : (
        <Arrow
          points={points}
          stroke={remoteSelector ? remoteSelector.color : isSelected ? '#3b82f6' : stroke}
          fill={remoteSelector ? remoteSelector.color : isSelected ? '#3b82f6' : stroke}
          strokeWidth={remoteSelector ? 4 : isSelected ? 4 : strokeWidth}
          pointerLength={12}
          pointerWidth={12}
          hitStrokeWidth={16}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* Indicador de seleção de colega */}
      {remoteSelector && (
        <Group x={points[0]} y={points[1] - 22}>
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
