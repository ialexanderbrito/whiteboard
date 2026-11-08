import React, { useRef, useMemo } from 'react';
import { Group, Rect, Circle, Line, Star, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { getContrastTextColor } from '../../utils/colors';
import { extractAllLinks, stripMarkdownLinks, layoutFormattedWords, normalizeUrl } from '../../utils/textLinks';

interface ShapeItemProps {
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

export const ShapeItem: React.FC<ShapeItemProps> = React.memo(({
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
  const shapeRef = useRef<Konva.Group>(null);
  const width = element.width || 160;
  const height = element.height || 100;
  const fill = element.fill || '#ffffff';
  const stroke = element.stroke || '#334155';
  const strokeWidth = element.strokeWidth || 2;
  const strokeColor = remoteSelector ? remoteSelector.color : isSelected ? userSelectionColor : stroke;
  const actualStrokeWidth = remoteSelector ? 2.5 : isSelected ? 2.5 : strokeWidth;

  const type = element.type;
  const radius = element.radius || width / 2;
  const defaultTextColor = getContrastTextColor(fill, '#0f172a', '#ffffff');
  const textColor = element.textColor || defaultTextColor;
  const isDarkFill = defaultTextColor === '#ffffff';
  const linkColor = isDarkFill ? '#60a5fa' : '#1d4ed8';

  const rawText = element.text || '';
  const cleanText = stripMarkdownLinks(rawText);
  const allLinks = useMemo(
    () => extractAllLinks(rawText, element.linkUrl, element.links),
    [rawText, element.linkUrl, element.links]
  );
  const hasLinks = allLinks.length > 0;

  const textWidth = type === 'circle' ? radius * 2 - 16 : width - 16;
  const textX = type === 'circle' ? -radius + 8 : 8;
  const textY = type === 'circle' ? -radius / 3 : height / 2 - 12;
  const fontSize = element.fontSize || 14;
  const textAlign = element.textAlign || 'center';

  const isBold = element.fontWeight === 'bold';
  const isItalic = element.fontStyle === 'italic';
  const fontStyleStr = isBold && isItalic ? 'bold italic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal';

  const formattedWords = useMemo(() => {
    if (!hasLinks || !cleanText) return null;
    return layoutFormattedWords(
      cleanText,
      textWidth,
      fontSize,
      fontStyleStr,
      textAlign,
      1.2,
      element.links,
      element.linkUrl
    );
  }, [cleanText, hasLinks, textWidth, fontSize, fontStyleStr, textAlign, element.links, element.linkUrl]);

  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);

  const handleDblClick = () => {
    if (!canEdit) return;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    if (onStartEditing) {
      onStartEditing(element.id, element.x, element.y, width, height, element.text || '');
    }
  };

  const handleLinkClick = (url: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if (isDraggingRef.current) return;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    clickTimeoutRef.current = setTimeout(() => {
      window.open(normalizeUrl(url), '_blank', 'noopener,noreferrer');
      clickTimeoutRef.current = null;
    }, 220);
  };

  const handleLinkDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    handleDblClick();
  };

  const renderShapeNode = () => {
    if (type === 'circle') {
      return (
        <Circle
          radius={radius}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={actualStrokeWidth}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={6}
          shadowOffset={{ x: 0, y: 2 }}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      );
    }

    if (type === 'diamond') {
      // Losango (Decisão)
      return (
        <Line
          points={[width / 2, 0, width, height / 2, width / 2, height, 0, height / 2]}
          closed
          fill={fill}
          stroke={strokeColor}
          strokeWidth={actualStrokeWidth}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={6}
          shadowOffset={{ x: 0, y: 2 }}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      );
    }

    if (type === 'triangle') {
      // Triângulo equilátero/isósceles
      return (
        <Line
          points={[width / 2, 0, width, height, 0, height]}
          closed
          fill={fill}
          stroke={strokeColor}
          strokeWidth={actualStrokeWidth}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={6}
          shadowOffset={{ x: 0, y: 2 }}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      );
    }

    if (type === 'star') {
      // Estrela de 5 pontas
      const outerR = Math.min(width, height) / 2;
      const innerR = outerR * 0.45;
      return (
        <Star
          x={width / 2}
          y={height / 2}
          numPoints={5}
          innerRadius={innerR}
          outerRadius={outerR}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={actualStrokeWidth}
          shadowColor="rgba(0,0,0,0.06)"
          shadowBlur={6}
          shadowOffset={{ x: 0, y: 2 }}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      );
    }

    // Default: Retângulo
    return (
      <Rect
        width={width}
        height={height}
        fill={fill}
        cornerRadius={6}
        stroke={strokeColor}
        strokeWidth={actualStrokeWidth}
        shadowColor="rgba(0,0,0,0.06)"
        shadowBlur={6}
        shadowOffset={{ x: 0, y: 2 }}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    );
  };

  return (
    <Group
      ref={shapeRef}
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={isItemDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
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
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        if (type === 'circle') {
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
            width: Math.max(20, Math.round(width * scaleX)),
            height: Math.max(20, Math.round(height * scaleY)),
            rotation: Math.round(node.rotation()),
          });
        }
      }}
    >
      {renderShapeNode()}

      {/* Indicador de Elemento Bloqueado */}
      {element.locked && (
        <Group x={type === 'circle' ? radius - 20 : width - 24} y={type === 'circle' ? -radius + 4 : 6} listening={false}>
          <Rect
            width={18}
            height={18}
            fill="rgba(0, 0, 0, 0.4)"
            cornerRadius={3}
            listening={false}
          />
          <Text
            text="🔒"
            fontSize={11}
            x={2}
            y={2}
            listening={false}
          />
        </Group>
      )}

      {/* Texto opcional centralizado na forma estilo Miro com suporte a hiperlinks sublinhados clicáveis */}
      {cleanText ? (
        formattedWords && formattedWords.length > 0 ? (
          <Group x={textX} y={textY} clipFunc={(ctx) => ctx.rect(0, 0, textWidth, height)}>
            {formattedWords.map((word) => (
              <Text
                key={word.id}
                text={word.text}
                x={word.x}
                y={word.y}
                fontSize={fontSize}
                fontFamily="system-ui, -apple-system, sans-serif"
                fontStyle={fontStyleStr}
                textDecoration={word.isLink ? 'underline' : (element.textDecoration || '')}
                fill={word.isLink ? linkColor : textColor}
                onClick={word.isLink && word.url ? (e) => handleLinkClick(word.url!, e) : undefined}
                onTap={word.isLink && word.url ? (e) => handleLinkClick(word.url!, e) : undefined}
                onDblClick={word.isLink ? handleLinkDblClick : undefined}
                onDblTap={word.isLink ? handleLinkDblClick : undefined}
                onMouseEnter={word.isLink ? (e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'pointer';
                } : undefined}
                onMouseLeave={word.isLink ? (e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = '';
                } : undefined}
                perfectDrawEnabled={false}
              />
            ))}
          </Group>
        ) : (
          <Text
            text={cleanText}
            x={textX}
            y={textY}
            width={textWidth}
            align={textAlign}
            fontSize={fontSize}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontStyle={fontStyleStr}
            textDecoration={element.textDecoration || ''}
            fill={textColor}
            perfectDrawEnabled={false}
          />
        )
      ) : null}

      {/* Tag do colega que está com a forma selecionada */}
      {remoteSelector && (
        <Group y={type === 'circle' ? -radius - 20 : -20} listening={false}>
          <Rect
            fill={remoteSelector.color}
            height={18}
            width={Math.max(60, remoteSelector.name.length * 8 + 14)}
            cornerRadius={[4, 4, 0, 0]}
            listening={false}
          />
          <Text
            text={remoteSelector.name}
            fill="#ffffff"
            fontSize={10}
            fontStyle="bold"
            x={6}
            y={3}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

ShapeItem.displayName = 'ShapeItem';
