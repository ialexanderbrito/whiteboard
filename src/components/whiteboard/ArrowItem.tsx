import React, { useRef } from 'react';
import { Group, Arrow, Line, Text, Rect, Circle } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface ArrowItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  allElements?: CanvasElement[];
  elementMap?: Map<string, CanvasElement>;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

export const ArrowItem: React.FC<ArrowItemProps> = React.memo(({
  element,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable,
  onSelect,
  onChange,
}) => {
  const lineRef = useRef<Konva.Group>(null);
  const points = element.points && element.points.length >= 4 ? element.points : [0, 0, 150, 100];
  const stroke = element.stroke || '#2563eb';
  const strokeWidth = element.strokeWidth || 3;
  const isLine = element.type === 'line';
  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;
  const isCurved = element.connectorStyle === 'curved';
  const isBezier = isCurved && points.length === 8;
  const tension = isCurved && !isBezier ? 0.35 : 0;

  const startX = points[0];
  const startY = points[1];
  const endX = points[points.length - 2];
  const endY = points[points.length - 1];

  return (
    <Group
      ref={lineRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      draggable={isItemDraggable}
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
          points: scaledPoints.map((p) => Math.round(p)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* Halo de seleção (remota ou local) por trás da linha/seta real */}
      {(remoteSelector || isSelected) && (
        isLine ? (
          <Line
            points={points}
            stroke={remoteSelector ? remoteSelector.color : userSelectionColor}
            strokeWidth={strokeWidth + 5}
            opacity={0.35}
            lineCap="round"
            lineJoin="round"
            tension={tension}
            bezier={isBezier}
            listening={false}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        ) : (
          <Arrow
            points={points}
            pointerLength={12}
            pointerWidth={10}
            fill={remoteSelector ? remoteSelector.color : userSelectionColor}
            stroke={remoteSelector ? remoteSelector.color : userSelectionColor}
            strokeWidth={strokeWidth + 5}
            opacity={0.35}
            lineCap="round"
            lineJoin="round"
            tension={tension}
            bezier={isBezier}
            listening={false}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        )
      )}

      {isLine ? (
        <Line
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={element.dash && element.dash.length > 0 ? element.dash : undefined}
          lineCap="round"
          lineJoin="round"
          tension={tension}
          bezier={isBezier}
          hitStrokeWidth={Math.max(16, strokeWidth + 10)}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      ) : (
        <Arrow
          points={points}
          pointerLength={12}
          pointerWidth={10}
          fill={stroke}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={element.dash && element.dash.length > 0 ? element.dash : undefined}
          lineCap="round"
          lineJoin="round"
          tension={tension}
          bezier={isBezier}
          hitStrokeWidth={Math.max(16, strokeWidth + 10)}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )}

      {/* Alças de extremidade quando o conector está selecionado */}
      {isSelected && (
        <>
          <Circle
            x={startX}
            y={startY}
            radius={element.startBinding ? 5 : 4}
            fill={element.startBinding ? stroke : '#ffffff'}
            stroke={userSelectionColor}
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            listening={false}
          />
          <Circle
            x={endX}
            y={endY}
            radius={element.endBinding ? 5 : 4}
            fill={element.endBinding ? stroke : '#ffffff'}
            stroke={userSelectionColor}
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            listening={false}
          />
        </>
      )}

      {/* Tag do colega que está com a linha/seta selecionada */}
      {remoteSelector && (
        <Group x={points[0]} y={points[1] - 24} listening={false}>
          <Rect
            fill={remoteSelector.color}
            height={20}
            width={Math.max(60, remoteSelector.name.length * 9)}
            cornerRadius={[4, 4, 0, 0]}
            listening={false}
          />
          <Text
            text={remoteSelector.name}
            fill="#ffffff"
            fontSize={11}
            fontStyle="bold"
            x={6}
            y={4}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

ArrowItem.displayName = 'ArrowItem';
