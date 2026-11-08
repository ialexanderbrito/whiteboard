import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CurrentUser } from '../../types/board';
import { X, Send } from 'lucide-react';
import { reactionService } from '@/services/reactionService';
import { playReactionPopSound } from '@/utils/audioChime';

interface CursorChatProps {
  boardId?: string;
  currentUser: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (msg: string | null) => void;
  onCommitMessage?: (msg: string) => void;
  // Posição na tela do mouse (screen coordinates)
  mouseScreenPos: { x: number; y: number };
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🎉', '🚀', '💡', '👀'];

export const CursorChat: React.FC<CursorChatProps> = ({
  boardId,
  currentUser,
  isOpen,
  onClose,
  onSendMessage,
  onCommitMessage,
  mouseScreenPos,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-foco ao abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cancelar e fechar sem enviar
  const handleCancel = useCallback(() => {
    setText('');
    onSendMessage(null);
    onClose();
  }, [onSendMessage, onClose]);

  // Enviar e confirmar mensagem (permanece visível no cursor)
  const handleSubmit = useCallback((content: string) => {
    const trimmed = content.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      onCommitMessage?.(trimmed);
    } else {
      onSendMessage(null);
    }
    setText('');
    onClose();
  }, [onSendMessage, onCommitMessage, onClose]);

  // Listener global para Esc: fecha o chat mesmo se o input tiver perdido o foco após clique no board
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isOpen, handleCancel]);

  // Fecha o chat se o usuário clicar no board ou fora do balão
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Não fecha se o clique foi dentro do próprio balão do chat
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }

      // Não fecha se o clique foi no botão de alternar chat da Toolbar (para evitar reabrir)
      if (target.closest('[data-cursor-chat-toggle]')) {
        return;
      }

      handleCancel();
    };

    window.addEventListener('mousedown', handlePointerDownOutside, true);
    window.addEventListener('touchstart', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside, true);
      window.removeEventListener('touchstart', handlePointerDownOutside, true);
    };
  }, [isOpen, handleCancel]);

  // Envia atualização em tempo real conforme o usuário digita
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    onSendMessage(val || null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancel();
    } else if (e.key === 'Enter') {
      e.stopPropagation();
      handleSubmit(text);
    }
  };

  const handleQuickEmoji = (emoji: string) => {
    if (boardId) {
      playReactionPopSound();
      reactionService.triggerReaction(boardId, emoji, currentUser.displayName, {
        x: mouseScreenPos.x + 14,
        y: mouseScreenPos.y + 18,
      });
    }
    handleSubmit(emoji);
  };

  if (!isOpen) return null;

  // Garante que o balão não estoure os limites da viewport
  const posX = Math.min(Math.max(16, mouseScreenPos.x + 14), window.innerWidth - 300);
  const posY = Math.min(Math.max(16, mouseScreenPos.y + 18), window.innerHeight - 100);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 pointer-events-auto transition-all duration-100 ease-out animate-cursor-bubble"
      style={{
        left: posX,
        top: posY,
      }}
      onMouseDown={(e) => {
        // Se clicar no corpo do balão (mas não em botões), mantém o foco no input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'BUTTON' && !target.closest('button')) {
          inputRef.current?.focus();
        }
      }}
    >
      <div className="flex flex-col gap-1.5 p-1.5 bg-card/95 dark:bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-[0_8px_30px_rgba(0,0,0,0.18)] min-w-[280px]">
        {/* Linha de Input com Avatar */}
        <div className="flex items-center gap-1.5">
          <div
            className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.displayName.charAt(0).toUpperCase()}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Diga algo no cursor... (Enter envia)"
            maxLength={60}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none px-1 py-1 font-medium"
          />

          {text.trim() ? (
            <button
              type="button"
              onClick={() => handleSubmit(text)}
              className="size-6 rounded-full hover:bg-muted text-primary flex items-center justify-center transition-[transform,background-color] duration-150 ease-out active:scale-[0.93]"
              title="Enviar mensagem (Enter)"
            >
              <Send className="size-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-[transform,background-color] duration-150 ease-out active:scale-[0.93]"
              title="Fechar (Esc)"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Emojis Rápidos para Reação Imediata */}
        <div className="flex items-center justify-between px-1 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleQuickEmoji(emoji)}
                className="size-6 rounded-md hover:bg-muted/80 flex items-center justify-center text-sm transition-[transform,background-color] duration-150 ease-out hover:scale-120 active:scale-[0.93] cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/60 select-none pr-1">
            Esc
          </span>
        </div>
      </div>
    </div>
  );
};
