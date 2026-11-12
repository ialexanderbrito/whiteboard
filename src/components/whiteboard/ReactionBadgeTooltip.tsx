import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasElement } from '../../types/element';
import { getContrastTextColor } from '../../utils/colors';
import {
  formatReactionVotersText,
  subscribeReactionTooltip,
  type ReactionBadgeHoverData,
} from '../../utils/reactionTooltip';
import { getViewport, subscribeViewport, type ViewportState } from '../../utils/viewport';

interface ReactionBadgeTooltipProps {
  elements: CanvasElement[];
  currentUserId?: string;
  resolveUserName: (userId: string) => string;
  resolveUserPhoto?: (userId: string) => string | null;
  resolveUserColor?: (userId: string) => string | null;
}

// Janela de tempo (ms) para abrir instantaneamente ao passar de um badge para o próximo
const SUBSEQUENT_HOVER_WINDOW_MS = 350;
const INITIAL_HOVER_DELAY_MS = 150;

let lastTooltipDismissedTime = 0;

export const ReactionBadgeTooltip: React.FC<ReactionBadgeTooltipProps> = React.memo(({
  elements,
  currentUserId,
  resolveUserName,
  resolveUserPhoto,
  resolveUserColor,
}) => {
  const [target, setTarget] = useState<ReactionBadgeHoverData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [placement, setPlacement] = useState<'below' | 'above'>('below');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeTargetRef = useRef<ReactionBadgeHoverData | null>(null);

  // Escuta os eventos de hover emitidos pelos badges de reação nos post-its
  useEffect(() => {
    const unsubscribe = subscribeReactionTooltip((data) => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      if (!data) {
        // Se o mouse saiu, fecha com suavidade e registra o timestamp para transições imediatas
        setIsVisible(false);
        lastTooltipDismissedTime = Date.now();
        delayTimerRef.current = setTimeout(() => {
          setTarget(null);
          activeTargetRef.current = null;
        }, 160);
        return;
      }

      activeTargetRef.current = data;
      const now = Date.now();
      const isSubsequentHover = now - lastTooltipDismissedTime < SUBSEQUENT_HOVER_WINDOW_MS;

      if (isSubsequentHover || isVisible) {
        // Transição instantânea entre badges vizinhos (Regra de Percepção de Performance Emil Kowalski)
        setTarget(data);
        setIsVisible(true);
      } else {
        // Delay deliberado de 150ms no primeiro hover para evitar flickering ao cruzar a tela
        delayTimerRef.current = setTimeout(() => {
          setTarget(data);
          setIsVisible(true);
          delayTimerRef.current = null;
        }, INITIAL_HOVER_DELAY_MS);
      }
    });

    return () => {
      unsubscribe();
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, [isVisible]);

  // Obtém os dados atualizados do elemento vivo (caso outros votos aconteçam em tempo real)
  const currentElement = useMemo(() => {
    if (!target) return null;
    return elements.find((el) => el.id === target.elementId) || null;
  }, [elements, target]);

  // Fecha o tooltip automaticamente caso o elemento ou a reação tenha sido removida
  const activeUsers = useMemo(() => {
    if (!target) return [];
    if (!currentElement) return target.users;
    const reactions = currentElement.reactions || {};
    return reactions[target.emoji] || target.users || [];
  }, [currentElement, target]);

  useEffect(() => {
    if (target && activeUsers.length === 0) {
      setIsVisible(false);
      setTarget(null);
      activeTargetRef.current = null;
    }
  }, [target, activeUsers.length]);

  // Posicionamento origin-aware recalculado e sincronizado com o viewport (pan & zoom)
  useEffect(() => {
    if (!target) return;

    const place = (vp: ViewportState) => {
      const node = tooltipRef.current;
      if (!node || !activeTargetRef.current) return;

      const { anchor } = activeTargetRef.current;
      const screenX = anchor.x * vp.scale + vp.x;
      const screenBottomY = anchor.y * vp.scale + vp.y;
      const screenTopY = anchor.topY * vp.scale + vp.y;

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;

      // Estimativa da altura do tooltip: nomes empilhados, um por linha
      const usersCount = Math.max(1, activeTargetRef.current.users.length);
      const estimatedHeight = 26 + usersCount * 17;
      // Usuário escolheu: abaixo por padrão; se não couber na viewport, abre acima
      const hasSpaceBelow = screenBottomY + estimatedHeight + 14 <= viewportHeight;
      const placeAbove = !hasSpaceBelow;

      setPlacement(placeAbove ? 'above' : 'below');

      const finalY = placeAbove ? screenTopY - 6 : screenBottomY + 6;
      // Garante que o tooltip não transborde as bordas laterais da tela
      const minPadding = 80;
      const clampedX = Math.max(minPadding, Math.min(viewportWidth - minPadding, screenX));

      node.style.left = `${clampedX}px`;
      node.style.top = `${finalY}px`;
    };

    place(getViewport());
    return subscribeViewport(place);
  }, [target]);

  // Formata os participantes em linguagem natural: "Você, Mariana e Pedro"
  const formattedVoters = useMemo(() => {
    if (!target || activeUsers.length === 0) return null;
    return formatReactionVotersText(activeUsers, currentUserId, resolveUserName, target.emoji);
  }, [target, activeUsers, currentUserId, resolveUserName]);

  if (!target || !formattedVoters) {
    return null;
  }

  const { names } = formattedVoters;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={names.join(', ')}
      className={`fixed z-50 pointer-events-none select-none max-w-[280px] sm:max-w-[340px] min-w-[64px] px-3 py-2 rounded-xl text-xs leading-snug border shadow-xl backdrop-blur-md bg-card/95 text-foreground border-border/80 transition-[opacity,transform] duration-150 ${
        placement === 'above' ? 'origin-bottom' : 'origin-top'
      } ${
        isVisible
          ? 'opacity-100 scale-100 translate-x-[-50%] translate-y-0'
          : `opacity-0 scale-[0.96] translate-x-[-50%] ${
              placement === 'above' ? 'translate-y-1' : 'translate-y-[-4px]'
            }`
      }`}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      {/* Lista vertical de participantes: foto + nome por linha, alinhado à esquerda, sem verbo nem emoji */}
      <div className="flex flex-col items-start gap-1 text-left">
        {activeUsers.map((userId, index) => {
          const photo = resolveUserPhoto?.(userId) || null;
          const color = resolveUserColor?.(userId) || null;
          const name = resolveUserName(userId);
          const initialsColor = color ? getContrastTextColor(color, '#0f172a', '#ffffff') : null;

          return (
            <div
              key={`${userId}-${index}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  className="size-4 shrink-0 rounded-full object-cover"
                  style={color ? { boxShadow: `0 0 0 1.5px ${color}` } : undefined}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold uppercase leading-none"
                  style={
                    color
                      ? { backgroundColor: color, color: initialsColor || '#ffffff' }
                      : undefined
                  }
                >
                  {name.charAt(0)}
                </span>
              )}
              <strong className="font-semibold text-foreground leading-tight truncate">
                {name}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ReactionBadgeTooltip.displayName = 'ReactionBadgeTooltip';
