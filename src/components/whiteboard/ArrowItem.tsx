import React, { useMemo, useRef } from 'react';
import { Group, Arrow, Line, Text, Rect, Circle } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';

interface ArrowItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  isDark?: boolean;
  allElements?: CanvasElement[];
  elementMap?: Map<string, CanvasElement>;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onStartEditing?: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string
  ) => void;
  onEndpointDragMove?: (
    arrowId: string,
    endpoint: 'start' | 'end',
    worldPos: { x: number; y: number }
  ) => void;
  onEndpointDragEnd?: (
    arrowId: string,
    endpoint: 'start' | 'end',
    worldPos: { x: number; y: number }
  ) => void;
}

/**
 * Calcula o ponto médio visual real de uma polilinha ou curva Bezier cúbica para ancorar o rótulo da seta.
 */
function computeConnectorMidpoint(
  points: ReadonlyArray<number>,
  isBezier: boolean
): { x: number; y: number } {
  if (isBezier && points.length === 8) {
    // Ponto t = 0.5 na curva Bezier cúbica B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
    const x = 0.125 * points[0] + 0.375 * points[2] + 0.375 * points[4] + 0.125 * points[6];
    const y = 0.125 * points[1] + 0.375 * points[3] + 0.375 * points[5] + 0.125 * points[7];
    return { x, y };
  }

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const len = Math.hypot(points[i + 2] - points[i], points[i + 3] - points[i + 1]);
    segLens.push(len);
    totalLen += len;
  }

  if (totalLen <= 0) {
    return { x: points[0] || 0, y: points[1] || 0 };
  }

  const half = totalLen / 2;
  let acc = 0;
  for (let s = 0; s < segLens.length; s++) {
    const segLen = segLens[s];
    if (acc + segLen >= half && segLen > 0) {
      const t = (half - acc) / segLen;
      const idx = s * 2;
      return {
        x: points[idx] + (points[idx + 2] - points[idx]) * t,
        y: points[idx + 1] + (points[idx + 3] - points[idx + 1]) * t,
      };
    }
    acc += segLen;
  }

  return {
    x: (points[0] + points[points.length - 2]) / 2,
    y: (points[1] + points[points.length - 1]) / 2,
  };
}

const DEFAULT_ARROW_POINTS: number[] = [0, 0, 150, 100];

export const ArrowItem: React.FC<ArrowItemProps> = React.memo(({
  element,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable,
  canEdit = true,
  isDark = false,
  onSelect,
  onChange,
  onStartEditing,
  onEndpointDragMove,
  onEndpointDragEnd,
}) => {
  const lineRef = useRef<Konva.Group>(null);
  const points = element.points && element.points.length >= 4 ? element.points : DEFAULT_ARROW_POINTS;
  const stroke = element.stroke || '#2563eb';
  const strokeWidth = element.strokeWidth || 3;
  const isLine = element.type === 'line';
  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;
  const isCurved = element.connectorStyle === 'curved';
  const isBezier = isCurved && points.length === 8;
  const tension = isCurved && !isBezier ? 0.35 : 0;

  const pointerAtBeginning = !isLine && element.startArrowhead === 'arrow';
  const pointerAtEnding = !isLine && element.endArrowhead !== 'none';

  const startX = points[0];
  const startY = points[1];
  const endX = points[points.length - 2];
  const endY = points[points.length - 1];

  const midpoint = useMemo(
    () => computeConnectorMidpoint(points, isBezier),
    [points, isBezier]
  );

  const labelText = (element.text || '').trim();
  const fontSize = element.fontSize || 12;
  const labelPaddingX = 10;
  const labelWidth = Math.max(36, Math.min(240, labelText.length * (fontSize * 0.62) + labelPaddingX * 2));
  const labelHeight = Math.max(22, fontSize + 10);

  const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!canEdit || element.locked || !onStartEditing) return;
    e.cancelBubble = true;
    const editW = Math.max(110, labelWidth);
    const editH = Math.max(32, labelHeight + 6);
    onStartEditing(
      element.id,
      Math.round(element.x + midpoint.x - editW / 2),
      Math.round(element.y + midpoint.y - editH / 2),
      editW,
      editH,
      element.text || ''
    );
  };

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
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragEnd={(e) => {
        const node = lineRef.current;
        if (!node || (e.target as Konva.Node) !== node) return;
        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
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
            pointerAtBeginning={pointerAtBeginning}
            pointerAtEnding={pointerAtEnding}
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
          hitStrokeWidth={Math.max(18, strokeWidth + 12)}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      ) : (
        <Arrow
          points={points}
          pointerLength={12}
          pointerWidth={10}
          pointerAtBeginning={pointerAtBeginning}
          pointerAtEnding={pointerAtEnding}
          fill={stroke}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={element.dash && element.dash.length > 0 ? element.dash : undefined}
          lineCap="round"
          lineJoin="round"
          tension={tension}
          bezier={isBezier}
          hitStrokeWidth={Math.max(18, strokeWidth + 12)}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )}

      {/* Rótulo de texto centralizado na seta/conector (estilo Miro / FigJam) */}
      {labelText.length > 0 && (
        <Group
          x={midpoint.x - labelWidth / 2}
          y={midpoint.y - labelHeight / 2}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
        >
          <Rect
            width={labelWidth}
            height={labelHeight}
            fill={isDark ? '#18181b' : '#ffffff'}
            stroke={isSelected ? userSelectionColor : stroke}
            strokeWidth={1.5}
            cornerRadius={6}
            shadowColor="rgba(0,0,0,0.16)"
            shadowBlur={4}
            shadowOffsetY={1}
            perfectDrawEnabled={false}
          />
          <Text
            text={labelText}
            width={labelWidth}
            height={labelHeight}
            align="center"
            verticalAlign="middle"
            fontSize={fontSize}
            fontStyle={element.fontWeight === 'bold' ? 'bold' : '600'}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
            fill={element.textColor || (isDark ? '#fafafa' : '#09090b')}
            ellipsis={true}
            wrap="none"
            listening={false}
          />
        </Group>
      )}

      {/* Alças interativas de extremidade para reconectar/desconectar pontas da seta */}
      {isSelected && (
        <>
          <Circle
            x={startX}
            y={startY}
            radius={element.startBinding ? 6.5 : 5.5}
            hitStrokeWidth={14}
            fill={element.startBinding ? stroke : '#ffffff'}
            stroke={userSelectionColor}
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            draggable={canEdit && !element.locked && Boolean(onEndpointDragEnd)}
            onMouseEnter={(e) => {
              if (!canEdit || element.locked || !onEndpointDragEnd) return;
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = '';
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              if (!onEndpointDragMove) return;
              const wx = element.x + e.target.x();
              const wy = element.y + e.target.y();
              onEndpointDragMove(element.id, 'start', { x: wx, y: wy });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              if (!onEndpointDragEnd) return;
              const wx = element.x + e.target.x();
              const wy = element.y + e.target.y();
              onEndpointDragEnd(element.id, 'start', { x: wx, y: wy });
            }}
          />
          <Circle
            x={endX}
            y={endY}
            radius={element.endBinding ? 6.5 : 5.5}
            hitStrokeWidth={14}
            fill={element.endBinding ? stroke : '#ffffff'}
            stroke={userSelectionColor}
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            draggable={canEdit && !element.locked && Boolean(onEndpointDragEnd)}
            onMouseEnter={(e) => {
              if (!canEdit || element.locked || !onEndpointDragEnd) return;
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = '';
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              if (!onEndpointDragMove) return;
              const wx = element.x + e.target.x();
              const wy = element.y + e.target.y();
              onEndpointDragMove(element.id, 'end', { x: wx, y: wy });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              if (!onEndpointDragEnd) return;
              const wx = element.x + e.target.x();
              const wy = element.y + e.target.y();
              onEndpointDragEnd(element.id, 'end', { x: wx, y: wy });
            }}
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
