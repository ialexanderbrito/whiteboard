import React, { useRef } from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface ShapeItemProps {
  element: CanvasElement;
  isSelected: boolean;
  remoteSelector?: { name: string; color: string };
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

export const ShapeItem: React.FC<ShapeItemProps> = ({
  element,
  isSelected,
  remoteSelector,
  onSelect,
  onChange,
}) => {
  const shapeRef = useRef<Konva.Group>(null);
  const width = element.width || 160;
  const height = element.height || 100;
  const fill = element.fill || '#ffffff';
  const stroke = element.stroke || '#334155';
  const strokeWidth = element.strokeWidth || 2;

  const isCircle = element.type === 'circle';
  const radius = element.radius || width / 2;

  return (
    <Group
      ref={shapeRef}
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
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        if (isCircle) {
          const newRadius = Math.max(20, Math.round(radius * Math.max(scaleX, scaleY)));
          onChange({
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            radius: newRadius,
            width: newRadius * 2,
            height: newRadius * 2,
            rotation: Math.round(node.rotation()),
          });
        } else {
          onChange({
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(40, Math.round(width * scaleX)),
            height: Math.max(40, Math.round(height * scaleY)),
            rotation: Math.round(node.rotation()),
          });
        }
      }}
    >
      {isCircle ? (
        <Circle
          radius={radius}
          fill={fill}
          stroke={
            remoteSelector
              ? remoteSelector.color
              : isSelected
              ? '#2563eb'
              : stroke
          }
          strokeWidth={remoteSelector ? 3 : isSelected ? 2.5 : strokeWidth}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={6}
        />
      ) : (
        <Rect
          width={width}
          height={height}
          fill={fill}
          stroke={
            remoteSelector
              ? remoteSelector.color
              : isSelected
              ? '#2563eb'
              : stroke
          }
          strokeWidth={remoteSelector ? 3 : isSelected ? 2.5 : strokeWidth}
          cornerRadius={6}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={6}
        />
      )}

      {/* Tag do colega remoto se selecionado */}
      {remoteSelector && (
        <Group x={isCircle ? -radius : 0} y={isCircle ? -radius - 22 : -22}>
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
