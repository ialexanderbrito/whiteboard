import React, { useRef, useMemo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { extractAllLinks, stripMarkdownLinks, layoutFormattedWords, normalizeUrl } from '../../utils/textLinks';
import { getContrastTextColor } from '../../utils/colors';
import { isCoarseOrMobileViewport } from '../../utils/viewport';

interface StickyNoteItemProps {
  element: CanvasElement;
  currentUserId?: string;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onToggleReaction?: (elementId: string, emoji: string) => void;
  onStartEditing: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fill: string
  ) => void;
}

export const StickyNoteItem: React.FC<StickyNoteItemProps> = React.memo(({
  element,
  currentUserId,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable,
  canEdit = true,
  onSelect,
  onChange,
  onToggleReaction,
  onStartEditing,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const width = element.width || 180;
  const height = element.height || 180;
  const fill = element.fill || '#fff9b1';
  const shadowsEnabled = !isCoarseOrMobileViewport();

  // Contraste automático da fonte com base na luminância do post-it ou cor personalizada do usuário
  const defaultTextColor = getContrastTextColor(fill, '#0f172a', '#ffffff');
  const textColor = element.textColor || defaultTextColor;
  const isDarkFill = defaultTextColor === '#ffffff';
  const linkColor = isDarkFill ? '#60a5fa' : '#1d4ed8';

  // Formatação tipográfica
  const isBold = element.fontWeight === 'bold';
  const isItalic = element.fontStyle === 'italic';
  const fontStyleStr = isBold && isItalic ? 'bold italic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal';
  const textDecorationStr = element.textDecoration || '';
  const textAlign = element.textAlign || 'left';
  const fontSize = element.fontSize || 14;
  const textWidth = width - 24;

  const rawText = element.text || '';
  const cleanText = stripMarkdownLinks(rawText);
  const allLinks = useMemo(
    () => extractAllLinks(rawText, element.linkUrl, element.links),
    [rawText, element.linkUrl, element.links]
  );
  const hasLinks = allLinks.length > 0;

  const formattedWords = useMemo(() => {
    if (!hasLinks || !cleanText) return null;
    return layoutFormattedWords(
      cleanText,
      textWidth,
      fontSize,
      fontStyleStr,
      textAlign,
      1.35,
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
    if (groupRef.current) {
      onStartEditing(
        element.id,
        element.x,
        element.y,
        width,
        height,
        element.text || '',
        fill
      );
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

  // Processa reações existentes
  const reactions = element.reactions || {};
  const activeReactions = Object.entries(reactions).filter(([, users]) => users && users.length > 0);

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

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(100, Math.round(width * scaleX)),
          height: Math.max(100, Math.round(height * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* Corpo autêntico de papel post-it (cantos retos/suaves de 3px, sem formato de balão) */}
      <Rect
        width={width}
        height={height}
        fill={fill}
        cornerRadius={3}
        shadowEnabled={shadowsEnabled}
        shadowColor="rgba(0, 0, 0, 0.14)"
        shadowBlur={isSelected ? 12 : 6}
        shadowOffset={{ x: 1, y: isSelected ? 4 : 2 }}
        shadowOpacity={0.8}
        stroke={
          remoteSelector
            ? remoteSelector.color
            : isSelected
            ? userSelectionColor
            : element.locked
            ? 'rgba(0,0,0,0.18)'
            : 'rgba(0,0,0,0.08)'
        }
        strokeWidth={remoteSelector ? 2.5 : isSelected ? 2 : 1}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />

      {/* Indicador de Elemento Bloqueado */}
      {element.locked && (
        <Group x={width - 24} y={6} listening={false}>
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

      {/* Conteúdo textual autêntico do Post-it estilo Miro com suporte a hiperlinks sublinhados clicáveis */}
      {formattedWords && formattedWords.length > 0 ? (
        <Group x={12} y={12} clipFunc={(ctx) => ctx.rect(0, 0, textWidth, height - 28)}>
          {formattedWords.map((word) => (
            <Text
              key={word.id}
              text={word.text}
              x={word.x}
              y={word.y}
              fontSize={fontSize}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle={fontStyleStr}
              textDecoration={word.isLink ? 'underline' : textDecorationStr}
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
          text={cleanText || 'Clique 2x para escrever...'}
          width={textWidth}
          height={height - 28}
          x={12}
          y={12}
          fontSize={fontSize}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle={fontStyleStr}
          textDecoration={textDecorationStr}
          fill={
            cleanText
              ? textColor
              : isDarkFill
              ? 'rgba(255, 255, 255, 0.45)'
              : 'rgba(15, 23, 42, 0.45)'
          }
          wrap="word"
          align={textAlign}
          verticalAlign="top"
          lineHeight={1.35}
          perfectDrawEnabled={false}
        />
      )}

      {/* Rodapé sutil com autor se disponível */}
      {element.updatedByName && (
        <Text
          text={element.updatedByName}
          x={12}
          y={height - 20}
          width={width - 24}
          align="right"
          fontSize={10}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={isDarkFill ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.4)'}
          fontStyle="italic"
          ellipsis={true}
          wrap="none"
          listening={false}
        />
      )}

      {/* Badges de Reações na base inferior do Post-it */}
      {activeReactions.length > 0 && (
        <Group y={height + 6} x={4}>
          {activeReactions.map(([emoji, users], index) => {
            const hasUserReacted = currentUserId ? users.includes(currentUserId) : false;
            const badgeWidth = Math.max(36, 24 + users.length.toString().length * 8);

            return (
              <Group
                key={emoji}
                x={index * 42}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onToggleReaction?.(element.id, emoji);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onToggleReaction?.(element.id, emoji);
                }}
              >
                <Rect
                  width={badgeWidth}
                  height={22}
                  fill={hasUserReacted ? '#f0fdf4' : '#ffffff'}
                  stroke={hasUserReacted ? '#16a34a' : '#cbd5e1'}
                  strokeWidth={hasUserReacted ? 1.5 : 1}
                  cornerRadius={11}
                  shadowEnabled={shadowsEnabled}
                  shadowColor="rgba(0,0,0,0.08)"
                  shadowBlur={3}
                  shadowOffset={{ x: 0, y: 1 }}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                />
                <Text
                  text={`${emoji} ${users.length}`}
                  fontSize={11}
                  fill={hasUserReacted ? '#15803d' : '#334155'}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontStyle="bold"
                  x={5}
                  y={5}
                  listening={false}
                />
              </Group>
            );
          })}
        </Group>
      )}

      {/* Tag do usuário remoto que está interagindo */}
      {remoteSelector && (
        <Group y={-20} listening={false}>
          <Rect
            width={remoteSelector.name.length * 8 + 14}
            height={18}
            fill={remoteSelector.color}
            cornerRadius={[4, 4, 0, 0]}
            listening={false}
          />
          <Text
            text={remoteSelector.name}
            x={6}
            y={3}
            fontSize={10}
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

StickyNoteItem.displayName = 'StickyNoteItem';
