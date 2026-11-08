import React, { useRef, useMemo } from 'react';
import { Group, Text, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { extractAllLinks, stripMarkdownLinks, layoutFormattedWords, normalizeUrl } from '../../utils/textLinks';

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
  const fill = element.textColor || element.fill || (element.linkUrl ? '#2563eb' : '#0f172a');
  const width = element.width || 200;
  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;

  const handleDblClick = () => {
    if (!canEdit) return;
    onStartEditing(
      element.id,
      element.x,
      element.y,
      width,
      fontSize * 1.5,
      text,
      'transparent',
      fontSize,
      fill
    );
  };

  const isBold = element.fontWeight === 'bold';
  const isItalic = element.fontStyle === 'italic';
  const fontStyleStr = isBold && isItalic ? 'bold italic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal';
  const textAlign = element.textAlign || 'left';

  const cleanText = stripMarkdownLinks(text);
  const allLinks = useMemo(
    () => extractAllLinks(text, element.linkUrl, element.links),
    [text, element.linkUrl, element.links]
  );
  const hasLinks = allLinks.length > 0;

  const defaultTextDark = element.fill === '#0f172a' || !element.fill;
  const linkColor = defaultTextDark ? '#2563eb' : element.fill;

  const formattedWords = useMemo(() => {
    if (!hasLinks || !cleanText) return null;
    return layoutFormattedWords(
      cleanText,
      width,
      fontSize,
      fontStyleStr,
      textAlign,
      1.2,
      element.links,
      element.linkUrl
    );
  }, [cleanText, hasLinks, width, fontSize, fontStyleStr, textAlign, element.links, element.linkUrl]);

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

  return (
    <Group
      ref={groupRef}
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
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(60, Math.round(width * scaleX)),
          fontSize: Math.max(12, Math.round(fontSize * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={width + 8}
          height={fontSize * 1.4 + 8}
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

      {/* Conteúdo textual estilo Miro com suporte a hiperlinks sublinhados clicáveis */}
      {formattedWords && formattedWords.length > 0 ? (
        <Group>
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
              fill={word.isLink ? linkColor : fill}
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
          fontSize={fontSize}
          fill={fill}
          width={width}
          align={textAlign}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle={fontStyleStr}
          textDecoration={element.textDecoration || ''}
          lineHeight={1.2}
          perfectDrawEnabled={false}
        />
      )}

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
