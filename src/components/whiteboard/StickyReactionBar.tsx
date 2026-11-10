import React, { useEffect, useRef } from 'react';
import type { CanvasElement } from '../../types/element';
import { getAppleEmojiUrl } from '../../utils/appleEmoji';
import { playReactionPopSound } from '../../utils/audioChime';
import { getElementWorldBounds } from '../../utils/elementBounds';
import { MIRIO_REACTION, getReactionImageUrl, isMirioReaction } from '../../utils/mirioReaction';
import { getViewport, subscribeViewport, type ViewportState } from '../../utils/viewport';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '💡', '🤔', '👀'];

interface StickyReactionBarProps {
  sticky: CanvasElement;
  onToggleReaction: (elementId: string, emoji: string) => void;
  mirioReactionUnlocked?: boolean;
  /** Distância extra (px) da base do post-it, usada para abrir espaço aos botões de adição rápida. */
  verticalOffset?: number;
}

/**
 * Floating reaction bar anchored to a single selected sticky.
 *
 * It positions itself through the shared viewport store, so pan/zoom updates
 * only touch this small element instead of re-rendering the whole board.
 */
export const StickyReactionBar: React.FC<StickyReactionBarProps> = React.memo(({
  sticky,
  onToggleReaction,
  mirioReactionUnlocked = false,
  verticalOffset = 10,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = (viewport: ViewportState) => {
      const node = barRef.current;
      if (!node) return;
      const bounds = getElementWorldBounds(sticky);
      const width = bounds.w * viewport.scale;
      const height = bounds.h * viewport.scale;
      node.style.left = `${bounds.x * viewport.scale + viewport.x + width / 2}px`;
      node.style.top = `${bounds.y * viewport.scale + viewport.y + height + verticalOffset}px`;
    };

    place(getViewport());
    return subscribeViewport(place);
  }, [sticky, verticalOffset]);

  return (
    <div
      ref={barRef}
      className="absolute z-50 flex items-center gap-1 bg-white/95 dark:bg-card/95 text-foreground backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-border/80 animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto select-none"
      style={{ transform: 'translateX(-50%)' }}
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
