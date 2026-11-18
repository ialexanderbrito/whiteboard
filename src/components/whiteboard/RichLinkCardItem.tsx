import React, { useEffect, useRef, useState } from 'react';
import { Group, Rect, Image as KonvaImage, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { parseRichLinkMetadata } from '../../utils/richEmbeds';
import { normalizeUrl } from '../../utils/textLinks';
import { isCoarseOrMobileViewport } from '../../utils/viewport';
import { LockBadge } from './LockBadge';

interface RichLinkCardItemProps {
  element: CanvasElement;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  isDark?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

const thumbImageCache = new Map<string, HTMLImageElement>();

const PROVIDER_BADGE_GLYPH: Record<string, string> = {
  github: 'GH',
  figma: 'FG',
  youtube: '▶',
  jira: 'JR',
  linear: 'LN',
  notion: 'N',
  docs: 'DOC',
  web: '🌐',
};

export const RichLinkCardItem: React.FC<RichLinkCardItemProps> = React.memo(
  ({
    element,
    isSelected,
    userSelectionColor = '#0284c7',
    remoteSelector,
    draggable = true,
    isDark = false,
    onSelect,
    onChange,
  }) => {
    const groupRef = useRef<Konva.Group>(null);
    const parsedFallback = element.linkUrl ? parseRichLinkMetadata(element.linkUrl) : null;

    const provider = element.embedProvider || parsedFallback?.provider || 'web';
    const title = element.embedTitle || parsedFallback?.title || element.text || 'Link Externo';
    const description =
      element.embedDescription || parsedFallback?.description || element.linkUrl || '';
    const domain = element.embedDomain || parsedFallback?.domain || 'web';
    const thumbUrl = element.embedThumbUrl || parsedFallback?.thumbUrl;
    const accentColor = element.stroke || parsedFallback?.accentColor || '#2563eb';

    const hasThumb = Boolean(thumbUrl);
    const width = Math.max(260, element.width || 320);
    const height = Math.max(hasThumb ? 228 : 114, element.height || (hasThumb ? 236 : 118));
    const thumbHeight = hasThumb ? Math.round(height * 0.56) : 0;

    const [thumbImg, setThumbImg] = useState<HTMLImageElement | null>(() =>
      thumbUrl && thumbImageCache.has(thumbUrl) ? thumbImageCache.get(thumbUrl)! : null
    );

    useEffect(() => {
      if (!thumbUrl) return;
      if (thumbImageCache.has(thumbUrl)) {
        setThumbImg(thumbImageCache.get(thumbUrl)!);
        return;
      }
      let active = true;
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        thumbImageCache.set(thumbUrl, img);
        if (active) setThumbImg(img);
      };
      img.onerror = () => {
        const retry = new window.Image();
        retry.onload = () => {
          thumbImageCache.set(thumbUrl, retry);
          if (active) setThumbImg(retry);
        };
        retry.src = thumbUrl;
      };
      img.src = thumbUrl;
      return () => {
        active = false;
      };
    }, [thumbUrl]);

    const cardBg = isDark ? '#18181b' : '#ffffff';
    const textMain = isDark ? '#f4f4f5' : '#0f172a';
    const textSub = isDark ? '#a1a1aa' : '#64748b';
    const borderCol = remoteSelector
      ? remoteSelector.color
      : isSelected
        ? userSelectionColor
        : isDark
          ? '#3f3f46'
          : '#e2e8f0';

    const openExternalLink = () => {
      const safe = normalizeUrl(element.linkUrl || '');
      if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
    };

    return (
      <Group
        ref={groupRef}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation || 0}
        draggable={draggable && !element.locked}
        onClick={(e) => {
          if (e.evt.ctrlKey || e.evt.metaKey) {
            e.cancelBubble = true;
            openExternalLink();
            return;
          }
          onSelect(e);
        }}
        onTap={onSelect}
        onDblClick={(e) => {
          e.cancelBubble = true;
          openExternalLink();
        }}
        onDragEnd={(e) => {
          if ((e.target as Konva.Node) !== groupRef.current) return;
          onChange({
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y()),
          });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(260, Math.round(width * sx)),
            height: Math.max(hasThumb ? 210 : 108, Math.round(height * sy)),
            rotation: Math.round(node.rotation()),
          });
        }}
      >
        {/* Corpo do card */}
        <Rect
          width={width}
          height={height}
          fill={cardBg}
          stroke={borderCol}
          strokeWidth={isSelected || remoteSelector ? 2 : 1.2}
          cornerRadius={12}
          shadowEnabled={!isCoarseOrMobileViewport()}
          shadowColor="rgba(15, 23, 42, 0.14)"
          shadowBlur={isSelected ? 16 : 8}
          shadowOffsetY={3}
          perfectDrawEnabled={false}
        />

        {/* Miniatura de vídeo / preview quando disponível */}
        {hasThumb && (
          <Group clipX={1} clipY={1} clipWidth={width - 2} clipHeight={thumbHeight} listening={false}>
            <Rect width={width} height={thumbHeight} fill="#09090b" />
            {thumbImg && (
              <KonvaImage
                image={thumbImg}
                x={0}
                y={0}
                width={width}
                height={thumbHeight}
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        )}

        {/* Faixa lateral de destaque da plataforma */}
        <Rect
          x={0}
          y={thumbHeight}
          width={5}
          height={height - thumbHeight}
          fill={accentColor}
          cornerRadius={hasThumb ? [0, 0, 0, 12] : [12, 0, 0, 12]}
          listening={false}
        />

        {/* Badge do Provedor + Domínio */}
        <Group x={16} y={thumbHeight + 13} listening={false}>
          <Rect width={24} height={20} cornerRadius={5} fill={accentColor} />
          <Text
            text={PROVIDER_BADGE_GLYPH[provider] || '↗'}
            width={24}
            y={4.5}
            align="center"
            fontSize={9}
            fontStyle="bold"
            fill="#ffffff"
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          />
          <Text
            text={domain}
            x={31}
            y={4}
            width={width - 96}
            fontSize={11}
            fontStyle="bold"
            fill={textSub}
            ellipsis={true}
            wrap="none"
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          />
        </Group>

        {/* Título principal */}
        <Text
          text={title}
          x={16}
          y={thumbHeight + 40}
          width={width - 32}
          height={22}
          fontSize={14}
          fontStyle="bold"
          fill={textMain}
          ellipsis={true}
          wrap="none"
          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          listening={false}
        />

        {/* Descrição / caminho */}
        <Text
          text={description}
          x={16}
          y={thumbHeight + 64}
          width={width - 32}
          height={32}
          fontSize={11}
          fill={textSub}
          ellipsis={true}
          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          listening={false}
        />

        {/* Botão direto Abrir Link */}
        <Group
          x={width - 36}
          y={thumbHeight + 11}
          onClick={(e) => {
            e.cancelBubble = true;
            openExternalLink();
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            openExternalLink();
          }}
        >
          <Rect
            width={24}
            height={24}
            cornerRadius={6}
            fill={isDark ? '#27272a' : '#f1f5f9'}
          />
          <Text
            text="↗"
            width={24}
            y={5}
            align="center"
            fontSize={13}
            fontStyle="bold"
            fill={textMain}
            listening={false}
          />
        </Group>

        {element.locked && <LockBadge x={width - 64} y={thumbHeight + 13} />}
      </Group>
    );
  }
);

RichLinkCardItem.displayName = 'RichLinkCardItem';
