import React from 'react';
import { Hand, MousePointer, StickyNote, MessagePin, Smile } from '@/components/ui/icons';
import { reactionService } from '../../services/reactionService';
import { playReactionPopSound } from '../../utils/audioChime';

interface MobileCollabDockProps {
  boardId: string;
  userName: string;
  canEdit: boolean;
  canComment: boolean;
  mobileInteractActive: boolean;
  onToggleInteractMode: (active: boolean) => void;
  onQuickAddSticky: () => void;
  onQuickAddComment: () => void;
}

const MOBILE_REACTIONS = ['👍', '❤️', '🔥', '🎉'];

/**
 * Barra inferior compacta para colaboração ágil no celular (< 768px):
 * permite alternar entre navegação fluida de 1 dedo e toque interativo (marcar checklists,
 * abrir threads de comentários), adicionar post-its rápidos e disparar reações.
 */
export const MobileCollabDock: React.FC<MobileCollabDockProps> = React.memo(
  ({
    boardId,
    userName,
    canEdit,
    canComment,
    mobileInteractActive,
    onToggleInteractMode,
    onQuickAddSticky,
    onQuickAddComment,
  }) => {
    const canContribute = canEdit || canComment;

    return (
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] flex justify-center">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-2xl border border-border/85 bg-background/95 dark:bg-card/95 backdrop-blur-xl px-2 py-1.5 shadow-xl">
          {canContribute && (
            <>
              <button
                type="button"
                onClick={() => onToggleInteractMode(false)}
                className={`h-9 px-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-95 ${
                  !mobileInteractActive
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Navegar pelo quadro com 1 dedo"
              >
                <Hand className="size-3.5" />
                <span>Mover</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleInteractMode(true)}
                className={`h-9 px-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-95 ${
                  mobileInteractActive
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Tocar para marcar checklists, votar e abrir comentários"
              >
                <MousePointer className="size-3.5" />
                <span>Tocar</span>
              </button>

              <div className="h-5 w-px bg-border/70 mx-0.5" />

              <button
                type="button"
                onClick={onQuickAddSticky}
                className="size-9 rounded-xl bg-amber-300/90 text-slate-950 flex items-center justify-center shadow-2xs active:scale-95"
                title="Adicionar Post-it rápido"
                aria-label="Adicionar Post-it rápido"
              >
                <StickyNote className="size-4" />
              </button>

              <button
                type="button"
                onClick={onQuickAddComment}
                className="size-9 rounded-xl bg-muted/80 text-foreground flex items-center justify-center active:scale-95"
                title="Adicionar Comentário fixado"
                aria-label="Adicionar Comentário fixado"
              >
                <MessagePin className="size-4" />
              </button>

              <div className="h-5 w-px bg-border/70 mx-0.5" />
            </>
          )}

          {/* Reações rápidas 1-toque */}
          <div className="flex items-center gap-0.5" aria-label="Reações rápidas">
            {!canContribute && <Smile className="size-3.5 text-muted-foreground mx-1" />}
            {MOBILE_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  playReactionPopSound();
                  void reactionService.triggerReaction(boardId, emoji, userName);
                }}
                className="size-8 rounded-lg flex items-center justify-center text-base active:scale-90 transition-transform"
                aria-label={`Reagir com ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

MobileCollabDock.displayName = 'MobileCollabDock';
