import React, { useRef } from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface FreeDrawItemProps {
  element: CanvasElement;
  isSelected: boolean;
  remoteSelector?: { name: string; color: string };
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

export const FreeDrawItem: React.FC<FreeDrawItemProps> = ({
  element,
  isSelected,
  remoteSelector,
  onSelect,
  onChange,
}) => {
  const lineRef = useRef<Konva.Group>(null);
  const points = element.points || [];
  const stroke = element.stroke || '#0f172a';
  const strokeWidth = element.strokeWidth || 3;

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
      <Line
        points={points}
        stroke={remoteSelector ? remoteSelector.color : isSelected ? '#3b82f6' : stroke}
        strokeWidth={remoteSelector ? strokeWidth + 2 : isSelected ? strokeWidth + 1 : strokeWidth}
        tension={0.4}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={18}
      />

      {remoteSelector && points.length >= 2 && (
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
