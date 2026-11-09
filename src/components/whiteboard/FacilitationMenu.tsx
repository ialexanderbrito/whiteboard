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
  Sparkles,
  MousePointer,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTheme } from '@/context/ThemeContext';
import { reactionService } from '@/services/reactionService';
import { getAppleEmojiUrl } from '@/utils/appleEmoji';
import { playReactionPopSound } from '@/utils/audioChime';
import { MIRIO_REACTION, getReactionImageUrl } from '@/utils/mirioReaction';

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
  showRemoteCursors?: boolean;
  onToggleRemoteCursors?: (show?: boolean) => void;
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
  showRemoteCursors = true,
  onToggleRemoteCursors,
  mirioReactionUnlocked = false,
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
              size="icon-sm"
              aria-label="Ferramentas e Preferências"
              className={`size-8 rounded-lg shadow-xs transition-all active:scale-[0.97] text-muted-foreground hover:text-foreground cursor-pointer ${
                open ? 'bg-muted border-foreground/30 text-foreground ring-1 ring-border' : ''
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Ferramentas e Preferências</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 sm:w-84 p-3 rounded-2xl shadow-xl border-border bg-card/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 select-none"
      >
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-xl mb-3 h-8">
            <TabsTrigger
              value="activities"
              className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all flex items-center justify-center gap-1.5 py-1"
            >
              <Sparkles className="size-3.5" />
              <span>Atividades</span>
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all flex items-center justify-center gap-1.5 py-1"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Visual</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Atividades (Reações Rápidas, Timer, Votação, Apresentação) */}
          <TabsContent value="activities" className="mt-0 space-y-3 focus-visible:outline-none">
            {/* Reações Rápidas */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
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

            {/* Ações de Colaboração */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                Colaboração
              </span>

              {/* Timer */}
              <button
                type="button"
                onClick={() => {
                  onToggleTimer();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium hover:bg-muted/80 text-foreground transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>Timer</span>
                </div>
                {isTimerOpen ? (
                  <span className="text-[10px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                    Ativo
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-normal">Abrir</span>
                )}
              </button>

              {/* Votação */}
              <button
                type="button"
                onClick={() => {
                  onOpenLeaderboard();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium hover:bg-muted/80 text-foreground transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Vote className="size-4 text-muted-foreground" />
                  <span>Votação</span>
                </div>
                {isVotingActive ? (
                  <span className="text-[10px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                    Em andamento
                  </span>
                ) : hasVotes ? (
                  <span className="text-[11px] text-muted-foreground font-semibold hover:text-foreground">Ver placar</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-normal">Iniciar</span>
                )}
              </button>

              {/* Apresentação */}
              <button
                type="button"
                onClick={() => {
                  onEnterPresentation();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium hover:bg-muted/80 text-foreground transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Tv className="size-4 text-muted-foreground" />
                  <span>Modo Apresentação</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-normal">Tela cheia</span>
              </button>
            </div>
          </TabsContent>

          {/* Aba 2: Visual (Posição da Barra, Tema, Grade) */}
          <TabsContent value="appearance" className="mt-0 space-y-3 focus-visible:outline-none">
            {/* Posição da Barra de Ferramentas */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                Posição da Barra
              </span>
              <div className="grid grid-cols-2 gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => onChangeToolbarPosition('left')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer active:scale-[0.98] ${
                    toolbarPosition === 'left'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PanelLeft className="size-3.5" />
                  <span>Esquerda</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeToolbarPosition('bottom')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer active:scale-[0.98] ${
                    toolbarPosition === 'bottom'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PanelBottom className="size-3.5" />
                  <span>Inferior</span>
                </button>
              </div>
            </div>

            {/* Tema */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                Tema
              </span>
              <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer active:scale-[0.98] ${
                    theme === 'light'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tema Claro"
                >
                  <Sun className="size-3.5" />
                  <span>Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer active:scale-[0.98] ${
                    theme === 'dark'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tema Escuro"
                >
                  <Moon className="size-3.5" />
                  <span>Escuro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer active:scale-[0.98] ${
                    theme === 'system'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tema do Sistema"
                >
                  <Monitor className="size-3.5" />
                  <span>Sistema</span>
                </button>
              </div>
            </div>

            {/* Cursores dos Colegas */}
            {onToggleRemoteCursors && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/60">
                <div className="flex items-center gap-2">
                  <MousePointer className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    Cursores dos Colegas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleRemoteCursors(!showRemoteCursors)}
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer active:scale-95 ${
                    showRemoteCursors
                      ? 'text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20'
                      : 'text-muted-foreground bg-muted hover:bg-muted/80 border border-border/60'
                  }`}
                  title={showRemoteCursors ? 'Ocultar cursores dos colegas' : 'Exibir cursores dos colegas'}
                >
                  {showRemoteCursors ? (
                    <>
                      <Eye className="size-3 text-primary" />
                      <span>Visíveis</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-3 text-muted-foreground" />
                      <span>Ocultos</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Grade */}
            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Grid className="size-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground tracking-tight">
                    Grade
                  </span>
                </div>
                {onToggleGrid && (
                  <button
                    type="button"
                    onClick={() => onToggleGrid(!showGrid)}
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer ${
                      showGrid
                        ? 'text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20'
                        : 'text-muted-foreground bg-muted hover:bg-muted/80 border border-border/60'
                    }`}
                    title={showGrid ? 'Ocultar grade' : 'Exibir grade'}
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
                  {/* Estilo da Grade */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground">Estilo</span>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { type: 'hybrid' as const, label: 'Híbrida', icon: LayoutGrid },
                        { type: 'dots' as const, label: 'Pontos', icon: CircleDot },
                        { type: 'lines' as const, label: 'Linhas', icon: Grid },
                        { type: 'crosses' as const, label: 'Cruzes', icon: Plus },
                        { type: 'isometric' as const, label: 'Isométrica', icon: Boxes },
                      ].map(({ type, label, icon: Icon }) => {
                        const isSelected = gridType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => onChangeGridType?.(type)}
                            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] border transition cursor-pointer active:scale-95 ${
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

                  {/* Opacidade */}
                  {onChangeGridOpacity && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-muted-foreground flex items-center gap-1">
                          <SlidersHorizontal className="size-3" />
                          <span>Opacidade</span>
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

                      {/* Presets rápidos */}
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
                              className={`py-0.5 px-1 rounded text-[9px] font-medium border transition cursor-pointer text-center active:scale-95 ${
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

                  {/* Densidade */}
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
                              className={`py-1 px-1 rounded-md text-[10px] font-medium border transition cursor-pointer text-center active:scale-95 ${
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
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
