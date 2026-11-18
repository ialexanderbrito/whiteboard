import React, { useState, useEffect, useRef } from 'react';
import { Check, RotateCcw, Send, Trash2, X } from '@/components/ui/icons';
import type { CanvasElement, CommentReply } from '../../types/element';
import type { CurrentUser, BoardMember } from '../../types/board';
import { getViewport, subscribeViewport, type ViewportState } from '../../utils/viewport';

interface CommentThreadPopoverProps {
  commentElement: CanvasElement;
  currentUser: CurrentUser;
  canEditOrComment: boolean;
  boardMembers?: Record<string, BoardMember>;
  onUpdateComment: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteComment: (id: string) => void;
  onClose: () => void;
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'agora';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function renderTextWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[\wÀ-ÿ.-]+)/g);
  return parts.map((part, idx) =>
    part.startsWith('@') ? (
      <span
        key={idx}
        className="px-1 py-0.2 rounded bg-primary/12 text-primary font-semibold"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

export const CommentThreadPopover: React.FC<CommentThreadPopoverProps> = ({
  commentElement,
  currentUser,
  canEditOrComment,
  boardMembers,
  onUpdateComment,
  onDeleteComment,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNewEmpty = !commentElement.text && (!commentElement.commentReplies || commentElement.commentReplies.length === 0);
  const [replyDraft, setReplyDraft] = useState('');

  useEffect(() => {
    const place = (vp: ViewportState) => {
      const node = popoverRef.current;
      if (!node) return;
      const screenX = (commentElement.x + 42) * vp.scale + vp.x;
      const screenY = commentElement.y * vp.scale + vp.y;

      const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const cardW = 312;
      const cardH = 320;

      const clampedX =
        screenX + cardW + 16 > vw
          ? Math.max(12, (commentElement.x - 12) * vp.scale + vp.x - cardW)
          : Math.max(12, screenX);
      const clampedY = Math.max(64, Math.min(vh - cardH - 16, screenY - 8));

      node.style.left = `${Math.round(clampedX)}px`;
      node.style.top = `${Math.round(clampedY)}px`;
    };

    place(getViewport());
    return subscribeViewport(place);
  }, [commentElement.x, commentElement.y]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [commentElement.id]);

  const memberSuggestions = Object.values(boardMembers || {})
    .map((m) => m.name)
    .filter((n): n is string => Boolean(n && n.trim()));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = replyDraft.trim();
    if (!trimmed || !canEditOrComment) return;

    if (!commentElement.text) {
      // Primeira mensagem do tópico
      onUpdateComment(commentElement.id, {
        text: trimmed,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName || 'Participante',
        commentAuthorColor: currentUser.color || '#2563eb',
      });
    } else {
      const nextReply: CommentReply = {
        id: `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Participante',
        authorColor: currentUser.color || '#2563eb',
        text: trimmed,
        createdAt: Date.now(),
      };
      onUpdateComment(commentElement.id, {
        commentReplies: [...(commentElement.commentReplies || []), nextReply],
      });
    }
    setReplyDraft('');
  };

  const handleToggleResolved = () => {
    if (!canEditOrComment) return;
    onUpdateComment(commentElement.id, {
      commentResolved: !commentElement.commentResolved,
    });
  };

  const canDelete =
    canEditOrComment &&
    (commentElement.updatedBy === currentUser.uid || isNewEmpty);

  return (
    <div
      ref={popoverRef}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-[308px] sm:w-[324px] rounded-2xl border border-border/85 bg-card/98 backdrop-blur-xl shadow-2xl text-foreground flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 select-text"
    >
      {/* Cabeçalho da Thread */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/25">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: commentElement.commentResolved
                ? '#10b981'
                : commentElement.commentAuthorColor || '#2563eb',
            }}
          />
          <span className="text-xs font-semibold truncate">
            {commentElement.commentResolved ? 'Comentário resolvido' : 'Thread de Comentário'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canEditOrComment && !isNewEmpty && (
            <button
              type="button"
              onClick={handleToggleResolved}
              title={commentElement.commentResolved ? 'Reabrir comentário' : 'Marcar como resolvido'}
              className={`h-7 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                commentElement.commentResolved
                  ? 'bg-muted hover:bg-muted/80 text-foreground'
                  : 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {commentElement.commentResolved ? (
                <>
                  <RotateCcw className="size-3" />
                  <span>Reabrir</span>
                </>
              ) : (
                <>
                  <Check className="size-3" />
                  <span>Resolver</span>
                </>
              )}
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => {
                onDeleteComment(commentElement.id);
                onClose();
              }}
              title="Excluir thread"
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isNewEmpty) onDeleteComment(commentElement.id);
              onClose();
            }}
            title="Fechar"
            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Lista de Mensagens da Thread */}
      {!isNewEmpty && (
        <div className="max-h-60 overflow-y-auto px-3.5 py-3 space-y-3 custom-scrollbar-thin">
          {/* Mensagem raiz */}
          {commentElement.text && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {commentElement.updatedByName || 'Participante'}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatRelativeTime(commentElement.updatedAt)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                {renderTextWithMentions(commentElement.text)}
              </p>
            </div>
          )}

          {/* Respostas encadeadas */}
          {(commentElement.commentReplies || []).map((rep) => (
            <div key={rep.id} className="pt-2.5 border-t border-border/50 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: rep.authorColor || '#64748b' }}
                  />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {rep.authorName}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatRelativeTime(rep.createdAt)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                {renderTextWithMentions(rep.text)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Barra rápida de menções (@) se houver membros */}
      {canEditOrComment && memberSuggestions.length > 0 && replyDraft.endsWith('@') && (
        <div className="px-3 py-1.5 bg-muted/40 border-t border-border/50 flex items-center gap-1 overflow-x-auto">
          {memberSuggestions.slice(0, 4).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setReplyDraft((prev) => `${prev}${name.replace(/\s+/g, '')} `);
                inputRef.current?.focus();
              }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background border border-border hover:bg-muted shrink-0 cursor-pointer"
            >
              @{name}
            </button>
          ))}
        </div>
      )}

      {/* Campo de Resposta / Novo Comentário */}
      {canEditOrComment && (
        <form onSubmit={handleSubmit} className="p-2.5 border-t border-border/60 bg-background/60 flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            rows={isNewEmpty ? 2 : 1}
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              } else if (e.key === 'Escape') {
                if (isNewEmpty) onDeleteComment(commentElement.id);
                onClose();
              }
            }}
            placeholder={
              isNewEmpty
                ? 'Escreva um comentário (@ para mencionar)...'
                : 'Responder na thread...'
            }
            className="flex-1 resize-none rounded-xl border border-border/75 bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 max-h-24"
          />
          <button
            type="submit"
            disabled={!replyDraft.trim()}
            aria-label="Enviar comentário"
            className="size-8 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0 disabled:opacity-40 transition-transform active:scale-95 cursor-pointer"
          >
            <Send className="size-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
