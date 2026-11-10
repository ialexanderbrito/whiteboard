import React, { useEffect, useMemo, useRef } from 'react';
import type { CanvasElement } from '../../types/element';
import { getAppleEmojiUrl } from '../../utils/appleEmoji';
import { playReactionPopSound } from '../../utils/audioChime';
import { getElementWorldBounds } from '../../utils/elementBounds';
import { MIRIO_REACTION, getReactionImageUrl, isMirioReaction } from '../../utils/mirioReaction';
import { getViewport, subscribeViewport, type ViewportState } from '../../utils/viewport';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '💡', '🤔', '👀'];

interface StickyReactionBarProps {
  sticky: CanvasElement;
  currentUserId?: string;
  /** Ponto de ancoragem em coordenadas do mundo (geralmente o botão '+' ou badge '+N' do post-it) */
  anchorPoint?: { x: number; y: number } | null;
  mode?: 'picker' | 'overflow';
  onClose?: () => void;
  onToggleReaction: (elementId: string, emoji: string) => void;
  mirioReactionUnlocked?: boolean;
}

/**
 * Popover flutuante contextual para post-its:
 * - Modo 'picker': barra rápida horizontal com os Apple Emojis mais populares.
 * - Modo 'overflow': painel detalhado que lista todas as reações ativas do post-it com contagem,
 *   indicando quais o usuário votou e permitindo votar/desvotar ou adicionar novas reações.
 */
export const StickyReactionBar: React.FC<StickyReactionBarProps> = React.memo(({
  sticky,
  currentUserId,
  anchorPoint,
  mode = 'picker',
  onClose,
  onToggleReaction,
  mirioReactionUnlocked = false,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const isOverflowMode = mode === 'overflow';

  // Processa todas as reações ativas no post-it
  const reactions = sticky.reactions || {};
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

  const totalVotesCount = useMemo(() => {
    return activeReactions.reduce((sum, [, users]) => sum + users.length, 0);
  }, [activeReactions]);

  useEffect(() => {
    const place = (viewport: ViewportState) => {
      const node = barRef.current;
      if (!node) return;
      const bounds = getElementWorldBounds(sticky);

      const targetWorldX = anchorPoint ? anchorPoint.x : bounds.x + bounds.w / 2;
      const targetWorldY = anchorPoint ? anchorPoint.y : bounds.y + bounds.h;

      const screenX = targetWorldX * viewport.scale + viewport.x;
      const screenY = targetWorldY * viewport.scale + viewport.y;

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
      const minPadding = isOverflowMode ? 150 : 140;
      const clampedX = Math.max(minPadding, Math.min(viewportWidth - minPadding, screenX));

      // Altura estimada do popover: se não couber abaixo da tela, posiciona acima da nota
      const popoverHeight = isOverflowMode ? 220 : 52;
      const hasSpaceBelow = screenY + popoverHeight + 16 <= viewportHeight;
      const placeAbove = !hasSpaceBelow;
      const finalY = placeAbove ? screenY - 10 : screenY + 12;

      node.style.left = `${clampedX}px`;
      node.style.top = `${finalY}px`;
      node.style.transform = placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
      node.style.transformOrigin = placeAbove ? 'bottom center' : 'top center';
    };

    place(getViewport());
    return subscribeViewport(place);
  }, [sticky, anchorPoint, isOverflowMode]);

  // Fecha o popover ao pressionar Escape ou clicar fora
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown);
    }, 40);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  if (isOverflowMode) {
    return (
      <div
        ref={barRef}
        className="absolute z-50 flex flex-col bg-white/95 dark:bg-card/95 text-foreground backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-border/80 animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto select-none min-w-[220px] max-w-[300px]"
      >
        {/* Cabeçalho com título, total de votos e fechar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span>Reações</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              ({totalVotesCount} {totalVotesCount === 1 ? 'voto' : 'votos'})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Lista de todas as reações do post-it */}
        <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-0.5 mb-2.5">
          {activeReactions.map(([emoji, users]) => {
            const isMirio = isMirioReaction(emoji);
            const imageUrl = getReactionImageUrl(emoji) || getAppleEmojiUrl(emoji);
            const hasUserReacted = currentUserId ? users.includes(currentUserId) : false;

            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggleReaction(sticky.id, emoji);
                  playReactionPopSound();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-[transform,background-color,border-color] duration-150 active:scale-95 cursor-pointer select-none ${
                  hasUserReacted
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'bg-muted/50 hover:bg-muted/80 border-border/60 text-foreground'
                }`}
                title={hasUserReacted ? 'Clique para remover seu voto' : 'Clique para votar'}
              >
                <img
                  src={imageUrl}
                  alt={isMirio ? 'Mirio' : emoji}
                  className="size-4 object-contain pointer-events-none drop-shadow-xs"
                />
                <span className="text-[11px] font-bold">{users.length}</span>
              </button>
            );
          })}
        </div>

        {/* Barra rápida inferior para adicionar uma nova reação */}
        <div className="pt-2 border-t border-border/60 flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Adicionar reação
          </span>
          <div className="flex items-center gap-1">
            {[...QUICK_EMOJIS, ...(mirioReactionUnlocked ? [MIRIO_REACTION] : [])].map((emoji) => {
              const imageUrl = getReactionImageUrl(emoji) || getAppleEmojiUrl(emoji);
              const isMirio = isMirioReaction(emoji);

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction(sticky.id, emoji);
                    playReactionPopSound();
                    onClose?.();
                  }}
                  className="size-7 rounded-full hover:bg-muted/80 transition-[transform,background-color] duration-150 ease-out hover:scale-120 active:scale-[0.93] flex items-center justify-center cursor-pointer select-none"
                  title={isMirio ? 'Reagir com Mirio' : `Reagir com ${emoji}`}
                >
                  <img
                    src={imageUrl}
                    alt={isMirio ? 'Reação Mirio' : emoji}
                    className="size-4.5 select-none pointer-events-none drop-shadow-xs object-contain"
                    loading="eager"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className="absolute z-50 flex items-center gap-1 bg-white/95 dark:bg-card/95 text-foreground backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-2xl border border-border/80 animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto select-none"
    >
      {[...QUICK_EMOJIS, ...(mirioReactionUnlocked ? [MIRIO_REACTION] : [])].map((emoji) => {
        const imageUrl = getReactionImageUrl(emoji) || getAppleEmojiUrl(emoji);
        const isMirio = isMirioReaction(emoji);

        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(sticky.id, emoji);
              playReactionPopSound();
              onClose?.();
            }}
            className="size-7 rounded-full hover:bg-muted/80 transition-[transform,background-color] duration-150 ease-out hover:scale-120 active:scale-[0.93] flex items-center justify-center cursor-pointer select-none"
            title={isMirio ? 'Reagir com Mirio' : `Reagir com ${emoji}`}
          >
            <img
              src={imageUrl}
              alt={isMirio ? 'Reação Mirio' : emoji}
              className="size-5 select-none pointer-events-none drop-shadow-xs object-contain"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </button>
        );
      })}
    </div>
  );
});

StickyReactionBar.displayName = 'StickyReactionBar';
