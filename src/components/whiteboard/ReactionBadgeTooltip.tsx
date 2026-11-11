import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasElement } from '../../types/element';
import {
  formatReactionVotersText,
  subscribeReactionTooltip,
  type ReactionBadgeHoverData,
} from '../../utils/reactionTooltip';
import { getReactionImageUrl } from '../../utils/mirioReaction';
import { getViewport, subscribeViewport, type ViewportState } from '../../utils/viewport';

interface ReactionBadgeTooltipProps {
  elements: CanvasElement[];
  currentUserId?: string;
  resolveUserName: (userId: string) => string;
}

// Janela de tempo (ms) para abrir instantaneamente ao passar de um badge para o próximo
const SUBSEQUENT_HOVER_WINDOW_MS = 350;
const INITIAL_HOVER_DELAY_MS = 150;

let lastTooltipDismissedTime = 0;

export const ReactionBadgeTooltip: React.FC<ReactionBadgeTooltipProps> = React.memo(({
  elements,
  currentUserId,
  resolveUserName,
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

      // Estimativa da altura do tooltip (linha simples ou dupla)
      const estimatedHeight = 36;
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

  const { names, verb, emoji, isMirio, appleEmojiUrl } = formattedVoters;
  const imageUrl = isMirio ? getReactionImageUrl(emoji) || appleEmojiUrl : appleEmojiUrl;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={`${names.join(', ')} ${verb} ${emoji}`}
      className={`fixed z-50 pointer-events-none select-none max-w-[280px] sm:max-w-[340px] px-2.5 py-1.5 rounded-lg text-xs leading-snug border shadow-xl backdrop-blur-md bg-slate-900/95 text-slate-100 border-slate-700/60 dark:bg-card/95 dark:text-foreground dark:border-border/80 transition-[opacity,transform] duration-150 ${
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
      <div className="flex items-center justify-center flex-wrap gap-x-1 text-center font-normal">
        {/* Lista fluida de nomes destacados em negrito com separadores elegantes */}
        {names.map((name, index) => {
          const isLast = index === names.length - 1;
          const isSecondToLast = index === names.length - 2;

          return (
            <React.Fragment key={`${name}-${index}`}>
              <strong className="font-semibold text-white dark:text-foreground">
                {name}
              </strong>
              {!isLast && (
                <span className="text-slate-400 dark:text-muted-foreground">
                  {isSecondToLast ? ' e' : ','}
                </span>
              )}
            </React.Fragment>
          );
        })}

        {/* Verbo concordando (reagiu com / reagiram com) */}
        <span className="text-slate-300 dark:text-muted-foreground ml-0.5">
          {verb}
        </span>

        {/* Emoji visual estilizado (Apple Emoji ou Mirio) */}
        <span className="inline-flex items-center align-middle ml-1">
          <img
            src={imageUrl}
            alt={isMirio ? 'Mirio' : emoji}
            className="size-4 object-contain drop-shadow-xs"
            onError={(e) => {
              // Fallback para o caractere de emoji nativo se a imagem falhar
              e.currentTarget.style.display = 'none';
              const fallbackSpan = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallbackSpan) fallbackSpan.style.display = 'inline';
            }}
          />
          <span className="hidden text-xs">{emoji}</span>
        </span>
      </div>
    </div>
  );
});

ReactionBadgeTooltip.displayName = 'ReactionBadgeTooltip';
