import React, { useState } from 'react';
import { 
  Clock, 
  Tv, 
  PanelLeft, 
  PanelBottom, 
  Moon, 
  Sun,
  Monitor,
  Vote,
  SlidersHorizontal,
  UserPen,
  Palette,
  Grid,
  CircleDot,
  Plus,
  LayoutGrid,
  Boxes,
  Eye,
  EyeOff
} from 'lucide-react';
import type { GridType, GridSize } from './CanvasGrid';
import { DEFAULT_GRID_OPACITY } from './CanvasGrid';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/context/ThemeContext';
import { reactionService } from '@/services/reactionService';
import { getAppleEmojiUrl } from '@/utils/appleEmoji';
import { playReactionPopSound } from '@/utils/audioChime';

interface FacilitationMenuProps {
  boardId: string;
  userName: string;
  isAnonymous?: boolean;
  onOpenEditProfile?: () => void;
  onToggleTimer: () => void;
  isTimerOpen: boolean;
  onOpenLeaderboard: () => void;
  hasVotes: boolean;
  isVotingActive?: boolean;
  onEnterPresentation: () => void;
  toolbarPosition: 'left' | 'bottom';
  onChangeToolbarPosition: (pos: 'left' | 'bottom') => void;
  gridType?: GridType;
  onChangeGridType?: (type: GridType) => void;
  gridSize?: GridSize;
  onChangeGridSize?: (size: GridSize) => void;
  gridOpacity?: number;
  onChangeGridOpacity?: (opacity: number) => void;
  showGrid?: boolean;
  onToggleGrid?: (show?: boolean) => void;
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
  isAnonymous = true,
  onOpenEditProfile,
  onToggleTimer,
  isTimerOpen,
  onOpenLeaderboard,
  hasVotes,
  isVotingActive = false,
  onEnterPresentation,
  toolbarPosition,
  onChangeToolbarPosition,
  gridType = 'hybrid',
  onChangeGridType,
  gridSize = 'medium',
  onChangeGridSize,
  gridOpacity = DEFAULT_GRID_OPACITY,
  onChangeGridOpacity,
  showGrid = true,
  onToggleGrid,
}) => {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSendReaction = async (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
    playReactionPopSound();
    await reactionService.triggerReaction(boardId, emoji, userName, origin);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-[0.97] ${
                open ? 'bg-muted border-foreground/30' : ''
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Ferramentas</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Reações, Timer, Votação e Configurações</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-72 sm:w-80 p-3.5 rounded-2xl shadow-2xl border-border bg-card/95 backdrop-blur-xl space-y-2.5">
        {/* 1. Barra de Reações Globais Flutuantes com Apple Emoji (Estilo Miro) */}
        <div className="flex items-center justify-between px-1 py-1 bg-muted/40 rounded-xl border border-border/60">
          {QUICK_GLOBAL_REACTIONS.map((r) => {
            const appleUrl = getAppleEmojiUrl(r.emoji);
            return (
              <button
                key={r.emoji}
                type="button"
                onClick={(e) => handleSendReaction(r.emoji, e)}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-background hover:scale-115 active:scale-[0.93] transition-[transform,background-color] duration-150 ease-out select-none cursor-pointer"
                title={`Enviar reação ${r.label}`}
              >
                <img
                  src={appleUrl}
                  alt={r.label}
                  className="size-5 select-none pointer-events-none drop-shadow-xs"
                  loading="eager"
                />
              </button>
            );
          })}
        </div>

        <Separator className="my-1.5" />

        {/* 2. Lista de Recursos e Facilitação */}
        <div className="space-y-0.5">
          {/* Timer */}
          <button
            type="button"
            onClick={() => {
              onToggleTimer();
              setOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium hover:bg-muted/80 text-foreground transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-muted-foreground" />
              <span>Timer / Cronômetro</span>
            </div>
            {isTimerOpen && <span className="text-[10px] font-bold text-primary">Aberto</span>}
          </button>

          {/* Votação (Estilo Miro) */}
          <button
            type="button"
            onClick={() => {
              onOpenLeaderboard();
              setOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium hover:bg-muted/80 text-foreground transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Vote className="size-4 text-amber-500" />
              <span>{isVotingActive ? 'Votação Ativa' : 'Votação'}</span>
            </div>
            {isVotingActive ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Em andamento</span>
              </span>
            ) : hasVotes ? (
              <span className="text-[10px] text-muted-foreground font-semibold">Ver Placar</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Iniciar</span>
            )}
          </button>

          {/* Apresentação (Tela Cheia) */}
          <button
            type="button"
            onClick={() => {
              onEnterPresentation();
              setOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium hover:bg-muted/80 text-foreground transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Tv className="size-4 text-muted-foreground" />
              <span>Modo Apresentação</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Tela Cheia</span>
          </button>
        </div>

        <Separator className="my-1.5" />

        {/* 3. Configurações de Posição da Barra de Ferramentas */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
            Posição das Ferramentas
          </span>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onChangeToolbarPosition('left')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                toolbarPosition === 'left'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <PanelLeft className="size-3.5" />
              <span>Esquerda</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeToolbarPosition('bottom')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                toolbarPosition === 'bottom'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <PanelBottom className="size-3.5" />
              <span>Inferior</span>
            </button>
          </div>
        </div>

        <Separator className="my-1.5" />

        {/* 4. Tema do Whiteboard (Claro / Escuro / Sistema) */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
            Tema da Tela
          </span>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title="Tema Claro"
            >
              <Sun className="size-3.5 text-amber-500" />
              <span>Claro</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title="Tema Escuro"
            >
              <Moon className="size-3.5 text-sky-400" />
              <span>Escuro</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                theme === 'system'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title="Tema do Sistema"
            >
              <Monitor className="size-3.5 text-muted-foreground" />
              <span>Sistema</span>
            </button>
          </div>
        </div>

        <Separator className="my-1.5" />

        {/* 5. Grade do Canvas (Mostrar/Ocultar, Estilo, Opacidade e Densidade) */}
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-2.5">
          {/* Header da Seção de Grade */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Grid className="size-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-foreground tracking-tight">
                Grade do Canvas
              </span>
            </div>
            {onToggleGrid && (
              <button
                type="button"
                onClick={() => onToggleGrid(!showGrid)}
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition shadow-2xs ${
                  showGrid
                    ? 'text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20'
                    : 'text-muted-foreground bg-muted hover:bg-muted/80 border border-border/60'
                }`}
                title={showGrid ? 'Ocultar grade do canvas' : 'Exibir grade do canvas'}
              >
                {showGrid ? (
                  <>
                    <Eye className="size-3 text-primary" />
                    <span>Visível</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="size-3 text-muted-foreground" />
                    <span>Oculta</span>
                  </>
                )}
              </button>
            )}
          </div>

          {showGrid ? (
            <>
              {/* Estilo de Grade (5 tipos com ícones e destaque) */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground">Estilo</span>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { type: 'hybrid' as const, label: 'Híbrida', icon: LayoutGrid },
                    { type: 'dots' as const, label: 'Pontos', icon: CircleDot },
                    { type: 'lines' as const, label: 'Linhas', icon: Grid },
                    { type: 'crosses' as const, label: 'Cruzes', icon: Plus },
                    { type: 'isometric' as const, label: '3D Iso', icon: Boxes },
                  ].map(({ type, label, icon: Icon }) => {
                    const isSelected = gridType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onChangeGridType?.(type)}
                        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] border transition cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/25'
                            : 'border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border'
                        }`}
                        title={`Grade ${label}`}
                      >
                        <Icon className="size-3.5" />
                        <span className="text-[9px] leading-tight truncate max-w-full font-medium">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controle de Opacidade das Linhas/Pontos */}
              {onChangeGridOpacity && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-muted-foreground flex items-center gap-1">
                      <SlidersHorizontal className="size-3" />
                      <span>Intensidade / Opacidade</span>
                    </span>
                    <span className="font-bold text-foreground font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border border-border/50">
                      {Math.round(gridOpacity * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={Math.round(gridOpacity * 100)}
                    onChange={(e) => onChangeGridOpacity(Number(e.target.value) / 100)}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    title={`Opacidade: ${Math.round(gridOpacity * 100)}%`}
                  />

                  {/* Presets rápidos de intensidade */}
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {[
                      { value: 0.3, label: 'Suave' },
                      { value: 0.55, label: 'Padrão' },
                      { value: 0.9, label: 'Nítida' },
                    ].map(({ value, label }) => {
                      const isPresetActive = Math.abs(gridOpacity - value) < 0.08;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onChangeGridOpacity(value)}
                          className={`py-0.5 px-1 rounded text-[9px] font-medium border transition cursor-pointer text-center ${
                            isPresetActive
                              ? 'border-primary/50 bg-primary/10 text-primary font-bold'
                              : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {label} ({Math.round(value * 100)}%)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Densidade / Espaçamento */}
              {onChangeGridSize && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-muted-foreground">Densidade</span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {gridSize === 'small' ? '24px' : gridSize === 'medium' ? '40px' : '64px'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { size: 'small' as const, label: 'Pequena' },
                      { size: 'medium' as const, label: 'Média' },
                      { size: 'large' as const, label: 'Grande' },
                    ].map(({ size, label }) => {
                      const isSelected = gridSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => onChangeGridSize(size)}
                          className={`py-1 px-1 rounded-md text-[10px] font-medium border transition cursor-pointer text-center ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                              : 'border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-2 text-[11px] text-muted-foreground">
              A grade está oculta.{' '}
              {onToggleGrid && (
                <button
                  type="button"
                  onClick={() => onToggleGrid(true)}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Ativar agora
                </button>
              )}
            </div>
          )}
        </div>

        {onOpenEditProfile && (
          <>
            <Separator className="my-1.5" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenEditProfile();
              }}
              className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isAnonymous ? (
                  <>
                    <UserPen className="size-3.5 text-primary" />
                    <span>Trocar meu nome</span>
                  </>
                ) : (
                  <>
                    <Palette className="size-3.5 text-primary" />
                    <span>Cor do meu cursor</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{userName}</span>
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
