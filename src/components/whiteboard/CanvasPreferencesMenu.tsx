import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  PanelLeft, 
  PanelBottom, 
  Moon, 
  Sun, 
  Monitor, 
  MousePointer, 
  Grid, 
  CircleDot, 
  Plus, 
  LayoutGrid, 
  Boxes, 
  Eye, 
  EyeOff
} from '@/components/ui/icons';
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

export interface CanvasPreferencesMenuProps {
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
}

export const CanvasPreferencesMenu: React.FC<CanvasPreferencesMenuProps> = ({
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
}) => {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Preferências de Visualização"
              className={`size-8 rounded-lg shadow-xs transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] text-muted-foreground hover:text-foreground cursor-pointer ${
                open ? 'bg-muted border-foreground/30 text-foreground ring-1 ring-border' : ''
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Preferências de Visualização</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 sm:w-84 p-3.5 rounded-2xl shadow-xl border-border bg-card/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 select-none origin-[var(--radix-popover-content-transform-origin)] space-y-3.5"
      >
        {/* Cabeçalho do Menu */}
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <div>
            <h4 className="text-xs font-semibold text-foreground tracking-tight">
              Preferências & Visual
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Aparência da interface e grade do canvas
            </p>
          </div>
          <span className="size-6 rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center">
            <SlidersHorizontal className="size-3" />
          </span>
        </div>

        {/* 1. Interface & Visual (Tema e Posição da Barra) */}
        <div className="space-y-2.5">
          {/* Modo de Tema */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">
              Tema do Mirio
            </span>
            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer active:scale-[0.97] ${
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
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer active:scale-[0.97] ${
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
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer active:scale-[0.97] ${
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

          {/* Posição da Barra de Ferramentas */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">
              Posição da Barra de Ferramentas
            </span>
            <div className="grid grid-cols-2 gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => onChangeToolbarPosition('left')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer active:scale-[0.97] ${
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
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer active:scale-[0.97] ${
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
        </div>

        <Separator className="my-1 opacity-60" />

        {/* 2. Colaboração & Cursores */}
        {onToggleRemoteCursors && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-2">
              <MousePointer className="size-3.5 text-muted-foreground" />
              <div>
                <span className="text-xs font-medium text-foreground block leading-tight">
                  Cursores dos Colegas
                </span>
                <span className="text-[10px] text-muted-foreground block leading-tight">
                  Exibe o movimento em tempo real
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleRemoteCursors(!showRemoteCursors)}
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-[transform,background-color,color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xs cursor-pointer active:scale-[0.95] ${
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

        <Separator className="my-1 opacity-60" />

        {/* 3. Grade do Canvas (Estilo, Densidade, Opacidade) */}
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-2.5">
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
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-[transform,background-color,color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xs cursor-pointer active:scale-[0.95] ${
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
                        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] border transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer active:scale-[0.95] ${
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
                    <span className="font-bold text-foreground font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border border-border/50 tabular-nums">
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
                          className={`py-0.5 px-1 rounded text-[9px] font-medium border transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer text-center active:scale-[0.95] ${
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
                          className={`py-1 px-1 rounded-md text-[10px] font-medium border transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer text-center active:scale-[0.95] ${
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
              A grade está oculta no canvas.{' '}
              {onToggleGrid && (
                <button
                  type="button"
                  onClick={() => onToggleGrid(true)}
                  className="text-primary font-semibold hover:underline cursor-pointer active:scale-[0.96] transition-transform"
                >
                  Ativar agora
                </button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
