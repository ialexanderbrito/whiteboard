import React, { useEffect, useMemo, useState } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { CanvasElement } from '../../types/element';
import { isCoarseOrMobileViewport } from '../../utils/viewport';
import { useTheme } from '../../context/ThemeContext';
import {
  isMirioReaction,
  loadMirioReactionImage,
  getCachedMirioReactionImage,
} from '../../utils/mirioReaction';
import {
  getCachedAppleEmojiImage,
  loadAppleEmojiImage,
} from '../../utils/appleEmoji';
import { playReactionPopSound } from '../../utils/audioChime';
import {
  publishReactionTooltip,
  getActiveReactionTooltip,
} from '../../utils/reactionTooltip';

const BADGE_HEIGHT = 22;
const GAP = 4;
const PLUS_BTN_WIDTH = 22;
const OVERFLOW_WIDTH = 26;

interface ElementReactionBadgesProps {
  element: CanvasElement;
  /** X local (dentro do Group do elemento) onde a fileira de badges começa */
  localLeftX: number;
  /** Y local da borda inferior do elemento (badges ficam metade dentro / metade fora) */
  localBottomY: number;
  /** Largura disponível para acomodar as pílulas */
  availableWidth: number;
  currentUserId?: string;
  canEdit?: boolean;
  mirioReactionUnlocked?: boolean;
  /** Hover do elemento: exibe o botão '+' discreto quando ainda não há reações */
  isHovered?: boolean;
  onToggleReaction?: (elementId: string, emoji: string) => void;
  onOpenReactionPicker?: (
    elementId: string,
    anchor: { x: number; y: number },
    mode?: 'picker' | 'overflow'
  ) => void;
}

/**
 * Badges de reações estilo Miro reutilizáveis para qualquer elemento do canvas
 * (formas, texto, sticker/gif, checklist...). Renderiza a fileira de pílulas na
 * borda inferior externa do elemento, badge de overflow (+N) e botão '+' de adição.
 */
export const ElementReactionBadges: React.FC<ElementReactionBadgesProps> = React.memo(({
  element,
  localLeftX,
  localBottomY,
  availableWidth,
  currentUserId,
  canEdit = true,
  mirioReactionUnlocked = false,
  isHovered = false,
  onToggleReaction,
  onOpenReactionPicker,
}) => {
  const [, setReactionRenderVersion] = useState(0);

  const reactions = element.reactions || {};
  const activeReactions = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [key, users] of Object.entries(reactions)) {
      if (!users || users.length === 0) continue;
      const canonicalKey = isMirioReaction(key) ? 'mirio_original' : key;
      const current = map.get(canonicalKey) || [];
      map.set(canonicalKey, [...new Set([...current, ...users])]);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [reactions]);

  const hasReactions = activeReactions.length > 0;

  // Carregador assíncrono de imagens Apple Emoji e Mirio
  useEffect(() => {
    activeReactions.forEach(([emoji]) => {
      if (isMirioReaction(emoji)) {
        if (!getCachedMirioReactionImage()) {
          void loadMirioReactionImage().then(() => {
            setReactionRenderVersion((v) => v + 1);
          });
        }
      } else {
        if (!getCachedAppleEmojiImage(emoji)) {
          loadAppleEmojiImage(emoji, () => {
            setReactionRenderVersion((v) => v + 1);
          });
        }
      }
    });
  }, [activeReactions]);

  // Fecha o tooltip de reação se o elemento for desmontado (ex: deletado)
  useEffect(() => {
    return () => {
      const active = getActiveReactionTooltip();
      if (active?.elementId === element.id) {
        publishReactionTooltip(null);
      }
    };
  }, [element.id]);

  const shadowsEnabled = !isCoarseOrMobileViewport();

  // Paleta padronizada: sempre segue o tema do app (claro = pílula branca,
  // escuro = pílula slate), independente da cor de fundo do elemento.
  const { isDark: isDarkFill } = useTheme();

  // Layout das pílulas ancoradas na borda inferior externa estilo Miro
  const badgesLayout = useMemo(() => {
    const available = availableWidth - (localLeftX === 0 ? 16 : 8);

    const badgeItems = activeReactions.map(([emoji, users]) => {
      const countStr = users.length.toString();
      const badgeWidth = Math.max(38, Math.round(20 + countStr.length * 7.5 + 8));
      return { emoji, users, countStr, badgeWidth };
    });

    let totalAll = 0;
    for (let i = 0; i < badgeItems.length; i++) {
      totalAll += badgeItems[i].badgeWidth + (i > 0 ? GAP : 0);
    }

    let visible: typeof badgeItems = [];
    let overflowCount = 0;

    if (totalAll + GAP + PLUS_BTN_WIDTH <= available) {
      visible = badgeItems;
      overflowCount = 0;
    } else {
      let count = 0;
      let curW = 0;
      for (let i = 0; i < badgeItems.length; i++) {
        const nextW =
          curW + (count > 0 ? GAP : 0) + badgeItems[i].badgeWidth + GAP + OVERFLOW_WIDTH + GAP + PLUS_BTN_WIDTH;
        if (nextW <= available) {
          count++;
          curW += (count > 1 ? GAP : 0) + badgeItems[i].badgeWidth;
        } else {
          break;
        }
      }
      const safeCount = Math.max(1, count);
      visible = badgeItems.slice(0, safeCount);
      overflowCount = badgeItems.length - safeCount;
    }

    let curX = 0;
    const positioned = visible.map((b) => {
      const x = curX;
      curX += b.badgeWidth + GAP;
      return { ...b, x };
    });

    const overflowX = overflowCount > 0 ? curX : null;
    if (overflowCount > 0) {
      curX += OVERFLOW_WIDTH + GAP;
    }

    // O '+' da fileira só aparece quando há reações (o hover '+' cobre o estado vazio,
    // evitando dois botões sobrepostos quando o elemento está em hover sem reações)
    const plusButtonX = canEdit && hasReactions ? curX : null;

    return {
      badges: positioned,
      overflowCount,
      overflowX,
      plusButtonX,
      y: Math.round(localBottomY - BADGE_HEIGHT / 2),
    };
  }, [activeReactions, availableWidth, localBottomY, localLeftX, canEdit, hasReactions]);

  if (!hasReactions && !isHovered) return null;

  // Calcula a âncora mundial (com rotação) para o tooltip de reações
  const publishBadgeTooltip = (emoji: string, users: string[], localBadgeX: number) => {
    const rotationRad = ((element.rotation || 0) * Math.PI) / 180;
    const localCenterX = localLeftX + localBadgeX + 19;
    const localBottomYRot = badgesLayout.y + BADGE_HEIGHT;
    const localTopY = badgesLayout.y;

    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);

    const worldBottomX = element.x + (localCenterX * cos - localBottomYRot * sin);
    const worldBottomY = element.y + (localCenterX * sin + localBottomYRot * cos);
    const worldTopY = element.y + (localCenterX * sin + localTopY * cos);

    publishReactionTooltip({
      elementId: element.id,
      emoji,
      users,
      anchor: {
        x: worldBottomX,
        y: worldBottomY,
        topY: worldTopY,
      },
    });
  };

  const badgePalette = (hasUserReacted: boolean) => ({
    fill: hasUserReacted
      ? isDarkFill
        ? 'rgba(22, 101, 52, 0.85)'
        : '#ecfdf5'
      : isDarkFill
      ? 'rgba(30, 41, 59, 0.95)'
      : '#ffffff',
    stroke: hasUserReacted
      ? isDarkFill
        ? '#4ade80'
        : '#10b981'
      : isDarkFill
      ? 'rgba(255, 255, 255, 0.20)'
      : 'rgba(0, 0, 0, 0.12)',
    countColor: hasUserReacted
      ? isDarkFill
        ? '#86efac'
        : '#065f46'
      : isDarkFill
      ? '#f8fafc'
      : '#334155',
  });

  return (
    <Group>
      {/* Fileira de pílulas de reações ativas */}
      {badgesLayout.badges.map(({ emoji, users, countStr, badgeWidth, x }) => {
        const hasUserReacted = currentUserId ? users.includes(currentUserId) : false;
        const isMirio = isMirioReaction(emoji);
        const isLocked = isMirio && !mirioReactionUnlocked;
        const palette = badgePalette(hasUserReacted);
        const emojiImg = isMirio ? getCachedMirioReactionImage() : getCachedAppleEmojiImage(emoji);

        return (
          <Group
            key={emoji}
            x={localLeftX + x}
            y={badgesLayout.y}
            onClick={(e) => {
              e.cancelBubble = true;
              if (isLocked) return;
              onToggleReaction?.(element.id, emoji);
              playReactionPopSound();
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              if (isLocked) return;
              onToggleReaction?.(element.id, emoji);
              playReactionPopSound();
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = isLocked ? 'default' : 'pointer';
              if (!isCoarseOrMobileViewport()) {
                publishBadgeTooltip(emoji, users, x);
              }
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = '';
              publishReactionTooltip(null);
            }}
          >
            <Rect
              width={badgeWidth}
              height={BADGE_HEIGHT}
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth={hasUserReacted ? 1.5 : 1}
              cornerRadius={11}
              shadowEnabled={shadowsEnabled}
              shadowColor="rgba(0,0,0,0.12)"
              shadowBlur={3}
              shadowOffset={{ x: 0, y: 1 }}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
            {emojiImg ? (
              <KonvaImage
                image={emojiImg}
                x={5}
                y={4}
                width={14}
                height={14}
                cornerRadius={isMirio ? 2 : 0}
                listening={false}
                perfectDrawEnabled={false}
              />
            ) : (
              <Rect
                x={5}
                y={4}
                width={14}
                height={14}
                fill={hasUserReacted ? '#86efac' : 'transparent'}
                cornerRadius={7}
                listening={false}
              />
            )}
            <Text
              text={countStr}
              x={22}
              y={4.5}
              fontSize={11}
              fill={palette.countColor}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="bold"
              listening={false}
            />
          </Group>
        );
      })}

      {/* Badge de Overflow (+N) que abre o painel detalhado de votos */}
      {badgesLayout.overflowCount > 0 && badgesLayout.overflowX !== null && (
        <Group
          x={localLeftX + badgesLayout.overflowX}
          y={badgesLayout.y}
          onClick={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + localLeftX + badgesLayout.overflowX! + 13,
                y: element.y + localBottomY,
              },
              'overflow'
            );
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + localLeftX + badgesLayout.overflowX! + 13,
                y: element.y + localBottomY,
              },
              'overflow'
            );
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = '';
          }}
        >
          <Rect
            width={OVERFLOW_WIDTH}
            height={BADGE_HEIGHT}
            fill={isDarkFill ? 'rgba(30, 41, 59, 0.95)' : '#ffffff'}
            stroke={isDarkFill ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.12)'}
            strokeWidth={1}
            cornerRadius={11}
            shadowEnabled={shadowsEnabled}
            shadowColor="rgba(0,0,0,0.10)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
          <Text
            text={`+${badgesLayout.overflowCount}`}
            x={0}
            y={4.5}
            width={OVERFLOW_WIDTH}
            align="center"
            fontSize={10}
            fontStyle="bold"
            fill={isDarkFill ? '#f8fafc' : '#475569'}
            fontFamily="system-ui, -apple-system, sans-serif"
            listening={false}
          />
        </Group>
      )}

      {/* Botão '+' no final da fileira para adicionar mais reações */}
      {badgesLayout.plusButtonX !== null && (
        <Group
          x={localLeftX + badgesLayout.plusButtonX}
          y={badgesLayout.y}
          onClick={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + localLeftX + badgesLayout.plusButtonX! + 11,
                y: element.y + localBottomY,
              },
              'picker'
            );
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + localLeftX + badgesLayout.plusButtonX! + 11,
                y: element.y + localBottomY,
              },
              'picker'
            );
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = '';
          }}
        >
          <Rect
            width={PLUS_BTN_WIDTH}
            height={BADGE_HEIGHT}
            fill={isDarkFill ? 'rgba(30, 41, 59, 0.95)' : '#ffffff'}
            stroke={isDarkFill ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.12)'}
            strokeWidth={1}
            cornerRadius={11}
            shadowEnabled={shadowsEnabled}
            shadowColor="rgba(0,0,0,0.10)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
          <Text
            text="+"
            x={0}
            y={2}
            width={PLUS_BTN_WIDTH}
            align="center"
            fontSize={13}
            fontStyle="bold"
            fill={isDarkFill ? '#94a3b8' : '#64748b'}
            fontFamily="system-ui, -apple-system, sans-serif"
            listening={false}
          />
        </Group>
      )}

      {/* Botão '+' discreto no hover quando o elemento NÃO tem nenhuma reação */}
      {!hasReactions && isHovered && canEdit && (
        <Group
          x={localLeftX + 8}
          y={Math.round(localBottomY - 11)}
          onClick={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + localLeftX + 8 + 11,
                y: element.y + localBottomY,
              },
              'picker'
            );
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + localLeftX + 8 + 11,
                y: element.y + localBottomY,
              },
              'picker'
            );
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = '';
          }}
        >
          <Rect
            width={24}
            height={22}
            fill={isDarkFill ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.96)'}
            stroke={isDarkFill ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.14)'}
            strokeWidth={1}
            cornerRadius={11}
            shadowEnabled={shadowsEnabled}
            shadowColor="rgba(0,0,0,0.12)"
            shadowBlur={3}
            shadowOffset={{ x: 0, y: 1 }}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
          <Text
            text="+"
            x={0}
            y={2}
            width={24}
            align="center"
            fontSize={13}
            fontStyle="bold"
            fill={isDarkFill ? '#94a3b8' : '#64748b'}
            fontFamily="system-ui, -apple-system, sans-serif"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

ElementReactionBadges.displayName = 'ElementReactionBadges';
