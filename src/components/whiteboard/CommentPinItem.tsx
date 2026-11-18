import React, { useRef, useState } from 'react';
import { Group, Circle, Path, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { isCoarseOrMobileViewport } from '../../utils/viewport';

interface CommentPinItemProps {
  element: CanvasElement;
  isSelected: boolean;
  isActiveThread?: boolean;
  draggable?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onOpenThread: (elementId: string) => void;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const CommentPinItem: React.FC<CommentPinItemProps> = React.memo(
  ({
    element,
    isSelected,
    isActiveThread = false,
    draggable = true,
    onSelect,
    onChange,
    onOpenThread,
  }) => {
    const groupRef = useRef<Konva.Group>(null);
    const [hovered, setHovered] = useState(false);

    const isResolved = Boolean(element.commentResolved);
    const replyCount = (element.commentReplies?.length || 0) + (element.text ? 1 : 0);
    const pinColor = isResolved
      ? '#10b981'
      : element.commentAuthorColor || element.fill || '#2563eb';
    const initials = isResolved ? '✓' : getInitials(element.updatedByName);
    const previewSnippet = (element.text || element.commentReplies?.[0]?.text || 'Novo comentário').slice(0, 54);

    return (
      <Group
        ref={groupRef}
        id={element.id}
        x={element.x}
        y={element.y}
        draggable={draggable && !element.locked}
        opacity={isResolved && !isSelected && !isActiveThread && !hovered ? 0.72 : 1}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(e);
          onOpenThread(element.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(e);
          onOpenThread(element.id);
        }}
        onMouseEnter={(e) => {
          setHovered(true);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'pointer';
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = '';
        }}
        onDragEnd={(e) => {
          onChange({
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y()),
          });
        }}
      >
        {/* Gota/Alfinete estilo FigJam/Miro ancorada no canto inferior esquerdo */}
        <Path
          data="M 18 0 C 28 0 36 8 36 18 C 36 28 28 36 18 36 L 4 36 C 1.8 36 0 34.2 0 32 L 0 18 C 0 8 8 0 18 0 Z"
          fill={pinColor}
          stroke={isSelected || isActiveThread ? '#ffffff' : 'rgba(255,255,255,0.85)'}
          strokeWidth={isSelected || isActiveThread ? 3 : 2}
          shadowEnabled={!isCoarseOrMobileViewport()}
          shadowColor="rgba(15, 23, 42, 0.28)"
          shadowBlur={isSelected || isActiveThread ? 14 : 8}
          shadowOffsetY={3}
          perfectDrawEnabled={false}
        />

        {/* Iniciais do autor ou check de resolvido */}
        <Text
          text={initials}
          x={0}
          y={10}
          width={36}
          align="center"
          fontSize={isResolved ? 15 : 12}
          fontStyle="bold"
          fill="#ffffff"
          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          listening={false}
        />

        {/* Contador de mensagens na thread */}
        {replyCount > 1 && !isResolved && (
          <Group x={25} y={-5} listening={false}>
            <Circle radius={9} fill="#0f172a" stroke="#ffffff" strokeWidth={1.5} />
            <Text
              text={replyCount > 9 ? '9+' : String(replyCount)}
              x={-9}
              y={-5}
              width={18}
              align="center"
              fontSize={9}
              fontStyle="bold"
              fill="#ffffff"
              listening={false}
            />
          </Group>
        )}

        {/* Prévia rápida ao passar o mouse (quando o painel completo não está aberto) */}
        {hovered && !isActiveThread && (
          <Group x={44} y={2} listening={false}>
            <Rect
              width={200}
              height={34}
              fill="#0f172a"
              cornerRadius={8}
              opacity={0.94}
              shadowEnabled={!isCoarseOrMobileViewport()}
              shadowColor="rgba(0,0,0,0.2)"
              shadowBlur={6}
            />
            <Text
              text={`${element.updatedByName || 'Participante'}: ${previewSnippet}`}
              x={10}
              y={10}
              width={180}
              height={16}
              ellipsis={true}
              wrap="none"
              fontSize={11}
              fill="#f8fafc"
              fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
            />
          </Group>
        )}
      </Group>
    );
  }
);

CommentPinItem.displayName = 'CommentPinItem';
