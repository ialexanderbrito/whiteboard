import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../../types/element';
import { extractAllLinks, stripMarkdownLinks, layoutFormattedWords, normalizeUrl } from '../../utils/textLinks';
import { getContrastTextColor } from '../../utils/colors';
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

interface StickyNoteItemProps {
  element: CanvasElement;
  currentUserId?: string;
  isSelected: boolean;
  userSelectionColor?: string;
  remoteSelector?: { name: string; color: string };
  draggable?: boolean;
  canEdit?: boolean;
  mirioReactionUnlocked?: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  onToggleReaction?: (elementId: string, emoji: string) => void;
  onOpenReactionPicker?: (
    elementId: string,
    anchor: { x: number; y: number },
    mode?: 'picker' | 'overflow'
  ) => void;
  onStartEditing: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fill: string
  ) => void;
  onHover?: (isHovered: boolean) => void;
}

export const StickyNoteItem: React.FC<StickyNoteItemProps> = React.memo(({
  element,
  currentUserId,
  isSelected,
  userSelectionColor = '#0284c7',
  remoteSelector,
  draggable,
  canEdit = true,
  mirioReactionUnlocked = false,
  onSelect,
  onChange,
  onToggleReaction,
  onOpenReactionPicker,
  onStartEditing,
  onHover,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const [, setReactionRenderVersion] = useState(0);
  const [isHoveredLocal, setIsHoveredLocal] = useState(false);

  const width = element.width || 180;
  const height = element.height || 180;
  const fill = element.fill || '#fff9b1';
  const shadowsEnabled = !isCoarseOrMobileViewport();

  // Contraste automático da fonte com base na luminância do post-it ou cor personalizada do usuário
  const defaultTextColor = getContrastTextColor(fill, '#0f172a', '#ffffff');
  const textColor = element.textColor || defaultTextColor;
  const isDarkFill = defaultTextColor === '#ffffff';
  const linkColor = isDarkFill ? '#60a5fa' : '#1d4ed8';
  // Badges de reação seguem o tema do app (padronizado em todos os elementos)
  const { isDark: isDarkTheme } = useTheme();

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

  // Gerenciamento de hover 100% à prova de flickering no Konva
  const handleMouseEnter = () => {
    setIsHoveredLocal(true);
    onHover?.(true);
  };

  const handleMouseMove = () => {
    if (!isHoveredLocal) setIsHoveredLocal(true);
    onHover?.(true);
  };

  const handleMouseLeave = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !groupRef.current) {
      setIsHoveredLocal(false);
      onHover?.(false);
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      setIsHoveredLocal(false);
      onHover?.(false);
      return;
    }
    // Mantém o hover apenas se o ponteiro ainda estiver sobre um filho deste
    // grupo (ex.: as pílulas de reação, que avançam além da borda). Sem essa
    // checagem o hover "pisca" ao passar sobre shapes com listening=false.
    // A checagem por delimitação geométrica (0..width) foi substituída porque
    // ela mantinha o hover "preso" quando outro elemento sobreposto (sticker/
    // GIF) cobria o post-it, renderizando dois botões '+' ao mesmo tempo.
    const intersection = stage.getIntersection(pointer);
    let node: Konva.Node | null = intersection ? intersection.getParent() : null;
    while (node) {
      if (node === groupRef.current) return;
      node = node.getParent();
    }
    setIsHoveredLocal(false);
    onHover?.(false);
  };

  // Processa reações ativas no post-it
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
            groupRef.current?.getLayer()?.batchDraw();
          });
        }
      } else {
        if (!getCachedAppleEmojiImage(emoji)) {
          loadAppleEmojiImage(emoji, () => {
            setReactionRenderVersion((v) => v + 1);
            groupRef.current?.getLayer()?.batchDraw();
          });
        }
      }
    });
  }, [activeReactions]);

  // Fecha o tooltip de reação se o post-it for desmontado (ex: deletado)
  useEffect(() => {
    return () => {
      const active = getActiveReactionTooltip();
      if (active?.elementId === element.id) {
        publishReactionTooltip(null);
      }
    };
  }, [element.id]);

  // Layout responsivo das pílulas de reações ancoradas na borda inferior externa estilo Miro
  const footerBadgesLayout = useMemo(() => {
    const START_X = 8;
    const GAP = 4;
    const BADGE_HEIGHT = 22;
    const PLUS_BTN_WIDTH = 22;
    const OVERFLOW_WIDTH = 26;
    // Largura disponível para as pílulas (deixando margem na direita para o autor)
    const available = width - 16;

    const badgeItems = activeReactions.map(([emoji, users]) => {
      const isMirio = isMirioReaction(emoji);
      const countStr = users.length.toString();
      const badgeWidth = Math.max(38, Math.round(20 + countStr.length * 7.5 + 8));
      return {
        emoji,
        users,
        isMirio,
        countStr,
        badgeWidth,
      };
    });

    let totalAll = 0;
    for (let i = 0; i < badgeItems.length; i++) {
      totalAll += badgeItems[i].badgeWidth + (i > 0 ? GAP : 0);
    }

    let visible: typeof badgeItems = [];
    let overflowCount = 0;

    // Se couber tudo + botão "+"
    if (totalAll + GAP + PLUS_BTN_WIDTH <= available) {
      visible = badgeItems;
      overflowCount = 0;
    } else {
      let count = 0;
      let curW = 0;
      for (let i = 0; i < badgeItems.length; i++) {
        const nextW = curW + (count > 0 ? GAP : 0) + badgeItems[i].badgeWidth + GAP + OVERFLOW_WIDTH + GAP + PLUS_BTN_WIDTH;
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

    let curX = START_X;
    const positioned = visible.map((b) => {
      const x = curX;
      curX += b.badgeWidth + GAP;
      return { ...b, x };
    });

    const overflowX = overflowCount > 0 ? curX : null;
    if (overflowCount > 0) {
      curX += OVERFLOW_WIDTH + GAP;
    }

    const plusButtonX = canEdit ? curX : null;

    return {
      badges: positioned,
      overflowCount,
      overflowX,
      plusButtonX,
      height: BADGE_HEIGHT,
      // Metade dentro / metade fora da borda inferior externa:
      y: Math.round(height - BADGE_HEIGHT / 2),
    };
  }, [activeReactions, width, height, canEdit]);

  // Alias para retrocompatibilidade de testes e layout dinâmico dos badges
  const reactionBadges = footerBadgesLayout.badges;

  // Reserva de altura do texto: como as pílulas ficam sobrepostas à borda inferior (metade fora),
  // o texto ganha quase todo o espaço interno, precisando apenas de folga para o autor
  const footerReserveHeight = element.updatedByName ? 18 : 12;
  const textMaxHeight = Math.max(20, height - 12 - footerReserveHeight);

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
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDragStart={() => {
        isDraggingRef.current = true;
        publishReactionTooltip(null);
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
      {/* Corpo autêntico de papel post-it (cantos retos/suaves de 3px) */}
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
        <Group x={12} y={12} clipFunc={(ctx) => ctx.rect(0, 0, textWidth, textMaxHeight)}>
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
          height={textMaxHeight}
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

      {/* Rodapé com autor no canto inferior direito interno */}
      {element.updatedByName && (
        <Text
          text={element.updatedByName}
          x={width - 86}
          y={height - 16}
          width={78}
          align="right"
          fontSize={9.5}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={isDarkFill ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.45)'}
          fontStyle="italic"
          ellipsis={true}
          wrap="none"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Badges de Reações com Imagens Apple Emoji no Canvas ancoradas na borda inferior estilo Miro */}
      {hasReactions && (
        <Group y={footerBadgesLayout.y}>
          {reactionBadges.map(({ emoji, users, isMirio, countStr, badgeWidth, x }) => {
            const hasUserReacted = currentUserId ? users.includes(currentUserId) : false;
            const isLocked = isMirio && !mirioReactionUnlocked;

            const badgeFill = hasUserReacted
              ? isDarkTheme
                ? 'rgba(22, 101, 52, 0.85)'
                : '#ecfdf5'
              : isDarkTheme
              ? 'rgba(30, 41, 59, 0.95)'
              : '#ffffff';

            const badgeStroke = hasUserReacted
              ? isDarkTheme
                ? '#4ade80'
                : '#10b981'
              : isDarkTheme
              ? 'rgba(255, 255, 255, 0.20)'
              : 'rgba(0, 0, 0, 0.12)';

            const countColor = hasUserReacted
              ? isDarkTheme
                ? '#86efac'
                : '#065f46'
              : isDarkTheme
              ? '#f8fafc'
              : '#334155';

            const emojiImg = isMirio
              ? getCachedMirioReactionImage()
              : getCachedAppleEmojiImage(emoji);

            return (
              <Group
                key={emoji}
                x={x}
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
                    const rotationRad = ((element.rotation || 0) * Math.PI) / 180;
                    const localCenterX = x + badgeWidth / 2;
                    const localBottomY = footerBadgesLayout.y + footerBadgesLayout.height;
                    const localTopY = footerBadgesLayout.y;

                    const cos = Math.cos(rotationRad);
                    const sin = Math.sin(rotationRad);

                    const worldBottomX = element.x + (localCenterX * cos - localBottomY * sin);
                    const worldBottomY = element.y + (localCenterX * sin + localBottomY * cos);
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
                  height={footerBadgesLayout.height}
                  fill={badgeFill}
                  stroke={badgeStroke}
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
                    cornerRadius={isMirio ? 2 : 7}
                    listening={false}
                  />
                )}
                <Text
                  text={countStr}
                  x={22}
                  y={4.5}
                  fontSize={11}
                  fill={countColor}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontStyle="bold"
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Badge de Overflow (+N) que abre o painel detalhado de votos */}
          {footerBadgesLayout.overflowCount > 0 && footerBadgesLayout.overflowX !== null && (
            <Group
              x={footerBadgesLayout.overflowX}
              onClick={(e) => {
                e.cancelBubble = true;
                onOpenReactionPicker?.(
                  element.id,
                  {
                    x: element.x + footerBadgesLayout.overflowX! + 13,
                    y: element.y + height,
                  },
                  'overflow'
                );
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onOpenReactionPicker?.(
                  element.id,
                  {
                    x: element.x + footerBadgesLayout.overflowX! + 13,
                    y: element.y + height,
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
                width={26}
                height={footerBadgesLayout.height}
                fill={isDarkTheme ? 'rgba(30, 41, 59, 0.95)' : '#ffffff'}
                stroke={isDarkTheme ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.12)'}
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
                text={`+${footerBadgesLayout.overflowCount}`}
                x={0}
                y={4.5}
                width={26}
                align="center"
                fontSize={10}
                fontStyle="bold"
                fill={isDarkTheme ? '#f8fafc' : '#475569'}
                fontFamily="system-ui, -apple-system, sans-serif"
                listening={false}
              />
            </Group>
          )}

          {/* Botão '+' integrado no final da fileira de badges para adicionar mais reações */}
          {footerBadgesLayout.plusButtonX !== null && (
            <Group
              x={footerBadgesLayout.plusButtonX}
              onClick={(e) => {
                e.cancelBubble = true;
                onOpenReactionPicker?.(
                  element.id,
                  {
                    x: element.x + footerBadgesLayout.plusButtonX! + 11,
                    y: element.y + height,
                  },
                  'picker'
                );
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onOpenReactionPicker?.(
                  element.id,
                  {
                    x: element.x + footerBadgesLayout.plusButtonX! + 11,
                    y: element.y + height,
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
                width={22}
                height={footerBadgesLayout.height}
                fill={isDarkTheme ? 'rgba(30, 41, 59, 0.95)' : '#ffffff'}
                stroke={isDarkTheme ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.12)'}
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
                width={22}
                align="center"
                fontSize={13}
                fontStyle="bold"
                fill={isDarkTheme ? '#94a3b8' : '#64748b'}
                fontFamily="system-ui, -apple-system, sans-serif"
                listening={false}
              />
            </Group>
          )}
        </Group>
      )}

      {/* Botão '+' discreto no hover quando o post-it NÃO tem nenhuma reação */}
      {!hasReactions && isHoveredLocal && canEdit && (
        <Group
          x={8}
          y={Math.round(height - 11)}
          onClick={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + 8 + 11,
                y: element.y + height,
              },
              'picker'
            );
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onOpenReactionPicker?.(
              element.id,
              {
                x: element.x + 8 + 11,
                y: element.y + height,
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
            fill={isDarkTheme ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.96)'}
            stroke={isDarkTheme ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.14)'}
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
            fill={isDarkTheme ? '#94a3b8' : '#64748b'}
            fontFamily="system-ui, -apple-system, sans-serif"
            listening={false}
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

StickyNoteItem.displayName = 'StickyNoteItem';
