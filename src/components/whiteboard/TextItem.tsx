import React, { useRef, useMemo } from 'react';
import { Group, Text, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { normalizeUrl } from '../../utils/textLinks';
import {
  RICH_TEXT_FONT_FAMILY,
  getElementBaseStyle,
  layoutElementRichText,
} from '../../utils/richText';

interface TextItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  isEditing?: boolean;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onStartEditing: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fill?: string,
    fontSize?: number,
    textColor?: string
  ) => void;
}

export const TextItem: React.FC<TextItemProps> = React.memo(({
  element,
  isSelected,
  userSelectionColor = '#0284c7',
  isEditing = false,
  remoteSelector,
  draggable,
  canEdit = true,
  onSelect,
  onChange,
  onStartEditing,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const text = element.text || '';
  const fontSize = element.fontSize || 20;
  const width = element.width || 200;
  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;
  const textAlign = element.textAlign || 'left';

  const baseStyle = useMemo(
    () => getElementBaseStyle(element),
    [
      element.fontWeight,
      element.fontStyle,
      element.textDecoration,
      element.textColor,
      element.fill,
    ]
  );

  // Layout com formatação por trecho (negrito, itálico, cor, links...).
  const layout = useMemo(
    () =>
      layoutElementRichText(element, {
        maxWidth: width,
        fontSize,
        align: textAlign,
        lineHeight: 1.2,
        fontFamily: RICH_TEXT_FONT_FAMILY,
        baseColor: baseStyle.color,
      }),
    [
      element.text,
      element.richText,
      element.links,
      element.linkUrl,
      element.fontWeight,
      element.fontStyle,
      element.textDecoration,
      element.textColor,
      element.fill,
      width,
      fontSize,
      textAlign,
      baseStyle.color,
    ]
  );

  const textHeight = layout.height;

  const handleDblClick = () => {
    if (!canEdit) return;
    onStartEditing(
      element.id,
      element.x,
      element.y,
      width,
      textHeight,
      text,
      'transparent',
      fontSize,
      baseStyle.color
    );
  };

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);

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

  // Se o usuário está digitando ativamente no editor HTML, oculta o texto Konva para evitar texto duplicado
  if (isEditing) {
    return null;
  }

  const fontStyleName = (bold: boolean, italic: boolean) =>
    bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal';

  const decorationName = (underline: boolean, strikethrough: boolean) => {
    if (underline && strikethrough) return 'underline line-through';
    if (underline) return 'underline';
    if (strikethrough) return 'line-through';
    return '';
  };

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
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
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        const nextWidth = Math.max(60, Math.round(width * scaleX));
        const nextFontSize = Math.max(12, Math.round(fontSize * scaleY));
        const nextLayout = layoutElementRichText(element, {
          maxWidth: nextWidth,
          fontSize: nextFontSize,
          align: textAlign,
          lineHeight: 1.2,
          fontFamily: RICH_TEXT_FONT_FAMILY,
          baseColor: baseStyle.color,
        });

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: nextWidth,
          height: Math.max(1, Math.round(nextLayout.height)),
          fontSize: nextFontSize,
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* Área invisível de hit-test para clique, duplo clique e arraste em toda a caixa de texto */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={textHeight}
        fill="rgba(0, 0, 0, 0)"
        perfectDrawEnabled={false}
      />

      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={width + 8}
          height={textHeight + 8}
          stroke={userSelectionColor}
          strokeWidth={1.5}
          dash={[3, 3]}
          cornerRadius={4}
          perfectDrawEnabled={false}
          listening={false}
        />
      )}

      {/* Indicador de Elemento Bloqueado */}
      {element.locked && (
        <Group x={width + 4} y={-4} listening={false}>
          <Rect
            width={16}
            height={16}
            fill="rgba(0, 0, 0, 0.4)"
            cornerRadius={3}
            listening={false}
          />
          <Text
            text="🔒"
            fontSize={10}
            x={1}
            y={2}
            listening={false}
          />
        </Group>
      )}

      {/* Conteúdo textual com formatação por trecho e links clicáveis */}
      <Group>
        {layout.tokens.map((token) => {
          const isLink = Boolean(token.url);
          return (
            <Text
              key={token.id}
              text={token.text}
              x={token.x}
              y={token.y}
              fontSize={fontSize}
              fontFamily={RICH_TEXT_FONT_FAMILY}
              fontStyle={fontStyleName(token.bold, token.italic)}
              textDecoration={decorationName(token.underline, token.strikethrough)}
              fill={token.color}
              lineHeight={1.2}
              onClick={isLink ? (e) => handleLinkClick(token.url!, e) : undefined}
              onTap={isLink ? (e) => handleLinkClick(token.url!, e) : undefined}
              onDblClick={isLink ? handleLinkDblClick : undefined}
              onDblTap={isLink ? handleLinkDblClick : undefined}
              onMouseEnter={isLink ? (e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'pointer';
              } : undefined}
              onMouseLeave={isLink ? (e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = '';
              } : undefined}
              perfectDrawEnabled={false}
            />
          );
        })}
      </Group>

      {/* Tag do colega que está com o texto selecionado */}
      {remoteSelector && (
        <Group y={-24} listening={false}>
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

TextItem.displayName = 'TextItem';
