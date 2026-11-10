import React, { useState } from 'react';
import { 
  Sparkles,
  Clock, 
  Tv, 
  Vote
} from '@/components/ui/icons';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { reactionService } from '@/services/reactionService';
import { getAppleEmojiUrl } from '@/utils/appleEmoji';
import { playReactionPopSound } from '@/utils/audioChime';
import { MIRIO_REACTION, getReactionImageUrl, isMirioReaction } from '@/utils/mirioReaction';

export interface FacilitationMenuProps {
  boardId: string;
  userName: string;
  isReadOnly?: boolean;
  isCommentOnly?: boolean;
  onToggleTimer: () => void;
  isTimerOpen: boolean;
  onOpenLeaderboard: () => void;
  hasVotes: boolean;
  isVotingActive?: boolean;
  onEnterPresentation: () => void;
  mirioReactionUnlocked?: boolean;
}

const QUICK_GLOBAL_REACTIONS = [
  { emoji: '👍', label: 'Curtir' },
  { emoji: '❤️', label: 'Amei' },
  { emoji: '🔥', label: 'Fogo' },
  { emoji: '🤯', label: 'Uau' },
  { emoji: '🎉', label: 'Comemorar' },
  { emoji: '👋', label: 'Olá' },
];

export const FacilitationMenu: React.FC<FacilitationMenuProps> = ({
  boardId,
  userName,
  isReadOnly = false,
  isCommentOnly = false,
  onToggleTimer,
  isTimerOpen,
  onOpenLeaderboard,
  hasVotes,
  isVotingActive = false,
  onEnterPresentation,
  mirioReactionUnlocked = false,
}) => {
  const [open, setOpen] = useState(false);

  const handleSendReaction = async (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isMirioReaction(emoji) && !mirioReactionUnlocked) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
    playReactionPopSound();
    await reactionService.triggerReaction(boardId, emoji, userName, origin);
  };

  const hasActiveFacilitation = isVotingActive || isTimerOpen;
  const cannotManageVoting = isReadOnly || isCommentOnly;

  const tooltipLabel = isVotingActive 
    ? 'Facilitação (Votação em andamento)' 
    : isTimerOpen 
      ? 'Facilitação (Timer ativo)' 
      : 'Facilitação & Atividades';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={tooltipLabel}
              className={`relative size-8 rounded-lg border border-border bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
                hasActiveFacilitation
                  ? 'text-primary border-primary/40 bg-primary/10 dark:bg-primary/20 hover:bg-primary/15'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              } ${
                open ? 'bg-muted/90 border-foreground/30 text-foreground ring-1 ring-border' : ''
              }`}
            >
              <Sparkles className="size-3.5" />

              {/* Indicador pulsante dinâmico quando houver votação ou timer ativo */}
              {isVotingActive ? (
                <span className="absolute -top-1 -right-1 flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
                </span>
              ) : isTimerOpen ? (
                <span className="absolute -top-1 -right-1 flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 sm:w-84 p-3.5 rounded-2xl shadow-xl border-border bg-card/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 select-none origin-[var(--radix-popover-content-transform-origin)] space-y-3"
      >
        {/* Cabeçalho do Menu de Facilitação */}
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <div>
            <h4 className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <span>Facilitação & Dinâmicas</span>
              {hasActiveFacilitation && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold border-primary/30 text-primary bg-primary/10">
                  Ativo
                </Badge>
              )}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Colaboração síncrona e dinâmicas de equipe
            </p>
          </div>
          <span className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="size-3" />
          </span>
        </div>

        {/* 1. Reações Rápidas Globais */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">
            Reações Rápidas
          </span>
          <div className="flex items-center justify-between p-1 bg-muted/40 rounded-xl border border-border/60">
            {[...QUICK_GLOBAL_REACTIONS, ...(mirioReactionUnlocked ? [{ emoji: MIRIO_REACTION, label: 'Mirio' }] : [])].map((r) => {
              const imageUrl = getReactionImageUrl(r.emoji) || getAppleEmojiUrl(r.emoji);

              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={(e) => handleSendReaction(r.emoji, e)}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-background hover:scale-115 active:scale-[0.93] transition-[transform,background-color] duration-150 ease-out select-none cursor-pointer"
                  title={`Enviar reação ${r.label}`}
                >
                  <img
                    src={imageUrl}
                    alt={r.label}
                    className="size-5 select-none pointer-events-none drop-shadow-xs object-contain"
                    loading="eager"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <Separator className="my-1.5 opacity-60" />

        {/* 2. Cartões de Atividades de Colaboração */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">
            Atividades no Quadro
          </span>

          {/* Timer do Quadro */}
          <button
            type="button"
            onClick={() => {
              onToggleTimer();
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] cursor-pointer text-left ${
              isTimerOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
                : 'bg-muted/30 border-border/60 hover:bg-muted/70 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                isTimerOpen ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}>
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">Timer Coletivo</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {isTimerOpen ? 'Contagem ativa visível no topo' : 'Temporizador de sprint ou timebox'}
                </p>
              </div>
            </div>

            {isTimerOpen ? (
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30 px-2 py-0.5 gap-1 shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">Abrir</span>
            )}
          </button>

          {/* Votação */}
          <button
            type="button"
            onClick={() => {
              onOpenLeaderboard();
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] cursor-pointer text-left ${
              isVotingActive
                ? 'bg-amber-500/10 border-amber-500/30 text-foreground'
                : 'bg-muted/30 border-border/60 hover:bg-muted/70 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                isVotingActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
              }`}>
                <Vote className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">Sessão de Votação</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {isVotingActive 
                    ? 'Votos sendo computados no quadro' 
                    : hasVotes 
                      ? 'Placar e resultados disponíveis' 
                      : 'Priorização e tomadas de decisão'}
                </p>
              </div>
            </div>

            {isVotingActive ? (
              <Badge variant="outline" className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30 px-2 py-0.5 gap-1 shrink-0">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                Em andamento
              </Badge>
            ) : hasVotes ? (
              <span className="text-[11px] text-primary font-semibold hover:underline shrink-0">Ver placar</span>
            ) : cannotManageVoting ? (
              <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                {isReadOnly ? 'Somente leitura' : 'Apenas comentários'}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">Iniciar</span>
            )}
          </button>

          {/* Modo Apresentação */}
          <button
            type="button"
            onClick={() => {
              onEnterPresentation();
              setOpen(false);
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 text-foreground transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
                <Tv className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">Modo Apresentação</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  Navegação por frames em tela cheia
                </p>
              </div>
            </div>

            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground shadow-2xs shrink-0">
              F5
            </kbd>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
