import React, { useRef, useState, useEffect } from 'react';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { getAppleEmojiUrl } from '../../utils/appleEmoji';

interface StickerItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

// Cache global de imagens e emojis da Apple para carregamento e renderização instantânea
const stickerImageCache = new Map<string, HTMLImageElement>();

export const StickerItem: React.FC<StickerItemProps> = React.memo(({
  element,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable,
  onSelect,
  onChange,
}) => {
  const groupRef = useRef<Konva.Group>(null);

  const width = element.width || 120;
  const height = element.height || 120;
  const isGif = element.type === 'gif';
  const isItemDraggable = draggable !== undefined ? draggable && !element.locked : !element.locked;

  // Se o sticker for um emoji puro ou não tiver src explícito, resolve a URL da Apple
  const resolvedSrc = element.src || (element.text ? getAppleEmojiUrl(element.text) : '');
  const activeStroke = remoteSelector
    ? remoteSelector.color
    : isSelected
    ? userSelectionColor
    : 'transparent';

  const [image, setImage] = useState<HTMLImageElement | null>(() => {
    return resolvedSrc && stickerImageCache.has(resolvedSrc) ? stickerImageCache.get(resolvedSrc)! : null;
  });

  useEffect(() => {
    if (!resolvedSrc || isGif) return;
    if (stickerImageCache.has(resolvedSrc)) {
      setImage(stickerImageCache.get(resolvedSrc)!);
      return;
    }
    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = resolvedSrc;
    img.onload = () => {
      stickerImageCache.set(resolvedSrc, img);
      if (isMounted) setImage(img);
    };
    img.onerror = () => {
      console.warn('Falha ao carregar imagem do sticker:', resolvedSrc);
    };
    return () => {
      isMounted = false;
    };
  }, [resolvedSrc, isGif]);

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={isItemDraggable}
      onClick={(e) => {
        if (element.linkUrl && (e.evt.ctrlKey || e.evt.metaKey)) {
          e.cancelBubble = true;
          window.open(element.linkUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        onSelect(e);
      }}
      onTap={(e) => {
        onSelect(e);
      }}
      onMouseEnter={(e) => {
        if (element.linkUrl) {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'pointer';
        }
      }}
      onMouseLeave={(e) => {
        if (element.linkUrl) {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }
      }}
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
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(40, Math.round(width * scaleX)),
          height: Math.max(40, Math.round(height * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    >
      {/* Indicador de Elemento Bloqueado */}
      {element.locked && (
        <Group x={width - 22} y={4} listening={false}>
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

      {/* 1. Imagem carregada (Apple Emoji ou Imagem personalizada) */}
      {image ? (
        <KonvaImage
          image={image}
          width={width}
          height={height}
          cornerRadius={8}
          shadowColor="rgba(0, 0, 0, 0.12)"
          shadowBlur={isSelected ? 12 : 4}
          shadowOffset={{ x: 0, y: 2 }}
          shadowOpacity={0.7}
          stroke={activeStroke}
          strokeWidth={isSelected || remoteSelector ? 2 : 0}
          perfectDrawEnabled={false}
        />
      ) : isGif ? (
        /* 2. Proxy interativo Konva para GIF animado (reproduzido em 60fps via HTML overlay sincronizado) */
        <Rect
          width={width}
          height={height}
          fill="rgba(0, 0, 0, 0.001)"
          stroke={activeStroke}
          strokeWidth={isSelected || remoteSelector ? 2 : 0}
          cornerRadius={6}
          perfectDrawEnabled={false}
        />
      ) : element.text ? (
        /* 3. Fallback de texto caso a imagem ainda esteja carregando */
        <Group>
          {isSelected && (
            <Rect
              width={width}
              height={height}
              stroke={activeStroke}
              strokeWidth={2}
              dash={[4, 4]}
              cornerRadius={8}
              perfectDrawEnabled={false}
              listening={false}
            />
          )}
          <Text
            text={element.text}
            width={width}
            height={height}
            fontSize={Math.round(Math.min(width, height) * 0.72)}
            align="center"
            verticalAlign="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            listening={false}
          />
        </Group>
      ) : (
        /* 4. Placeholder enquanto carrega */
        <Group listening={false}>
          <Rect
            width={width}
            height={height}
            fill="rgba(241, 245, 249, 0.6)"
            stroke={isSelected ? activeStroke : '#cbd5e1'}
            strokeWidth={1.5}
            cornerRadius={8}
            perfectDrawEnabled={false}
            listening={false}
          />
          <Text
            text={element.alt || 'Carregando...'}
            width={width}
            height={height}
            fontSize={12}
            align="center"
            verticalAlign="middle"
            fill="#94a3b8"
            listening={false}
          />
        </Group>
      )}

      {/* Badge Flutuante de Link Estilo Miro em Stickers */}
      {element.linkUrl && (
        <Group
          x={width - 12}
          y={-10}
          onClick={(e) => {
            e.cancelBubble = true;
            window.open(element.linkUrl, '_blank', 'noopener,noreferrer');
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            window.open(element.linkUrl, '_blank', 'noopener,noreferrer');
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }}
        >
          <Rect
            width={20}
            height={20}
            fill="#2563eb"
            cornerRadius={4}
            shadowColor="rgba(0, 0, 0, 0.25)"
            shadowBlur={4}
            shadowOffsetY={1}
          />
          <Text
            text="↗"
            fill="#ffffff"
            fontSize={12}
            fontStyle="bold"
            x={5}
            y={2}
          />
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

StickerItem.displayName = 'StickerItem';
