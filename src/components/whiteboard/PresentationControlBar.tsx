import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Minimize,
  ZoomIn,
  ZoomOut,
  Tv,
  Laser,
  Pipette,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CanvasElement } from '@/types/element';
import { DEFAULT_LASER_COLOR, LASER_COLOR_OPTIONS } from '@/utils/laserGeometry.ts';

interface PresentationControlBarProps {
  frames: CanvasElement[];
  currentFrameIndex: number;
  onNavigateFrame: (index: number) => void;
  onExitPresentation: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  scale: number;
  isLaserActive?: boolean;
  onToggleLaser?: () => void;
  laserColor?: string;
  onSelectLaserColor?: (color: string) => void;
}

export const PresentationControlBar: React.FC<PresentationControlBarProps> = ({
  frames,
  currentFrameIndex,
  onNavigateFrame,
  onExitPresentation,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  scale,
  isLaserActive = false,
  onToggleLaser,
  laserColor = DEFAULT_LASER_COLOR,
  onSelectLaserColor,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const laserGroupRef = useRef<HTMLDivElement>(null);
  const totalFrames = frames.length;

  const handlePrev = () => {
    if (totalFrames === 0) return;
    const prev = currentFrameIndex > 0 ? currentFrameIndex - 1 : totalFrames - 1;
    onNavigateFrame(prev);
  };

  const handleNext = () => {
    if (totalFrames === 0) return;
    const next = currentFrameIndex < totalFrames - 1 ? currentFrameIndex + 1 : 0;
    onNavigateFrame(next);
  };

  useEffect(() => {
    if (!isColorOpen) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (laserGroupRef.current && !laserGroupRef.current.contains(e.target as Node)) {
        setIsColorOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDownOutside);
    return () => window.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [isColorOpen]);

  // Atalhos de teclado para apresentação: Setas esquerda/direita navegam frames
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (isColorOpen) {
          setIsColorOpen(false);
          return;
        }
        onExitPresentation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300"
      style={{ opacity: isHovered || isColorOpen ? 1 : 0.85 }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-background/90 dark:bg-card/90 backdrop-blur-xl shadow-2xl">
        {/* Indicador de Modo Apresentação */}
        <div className="flex items-center gap-1.5 pl-1.5 pr-2 border-r border-border text-primary font-medium text-xs select-none">
          <Tv className="size-3.5" />
          <span className="hidden sm:inline">Apresentação</span>
        </div>

        {/* Navegação de Slides (se houver frames no quadro) */}
        {totalFrames > 0 ? (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handlePrev}
                  className="size-7 rounded-full text-foreground hover:bg-muted active:scale-[0.97]"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Slide Anterior (←)</TooltipContent>
            </Tooltip>

            <span className="text-xs font-mono font-medium px-2 text-foreground select-none">
              {currentFrameIndex + 1} / {totalFrames}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleNext}
                  className="size-7 rounded-full text-foreground hover:bg-muted active:scale-[0.97]"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Próximo Slide (→ ou Espaço)</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground px-2 select-none">
            Navegação livre no quadro
          </span>
        )}

        {/* Divisor */}
        <div className="h-4 w-px bg-border" />

        {/* Controles de Zoom */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onZoomOut}
                className="size-7 rounded-full text-muted-foreground hover:text-foreground active:scale-[0.97]"
              >
                <ZoomOut className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Diminuir Zoom (-)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onResetZoom}
                className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition active:scale-[0.97]"
              >
                {Math.round(scale * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Redefinir Zoom para 100%</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onZoomIn}
                className="size-7 rounded-full text-muted-foreground hover:text-foreground active:scale-[0.97]"
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Aumentar Zoom (+)</TooltipContent>
          </Tooltip>
        </div>

        {/* Divisor */}
        <div className="h-4 w-px bg-border" />

        {/* Apontador Laser e Seletor de Cor na Apresentação */}
        <div ref={laserGroupRef} className="relative flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isLaserActive ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={onToggleLaser}
                className={`size-7 rounded-full active:scale-[0.97] transition-all relative ${
                  isLaserActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Laser className="size-3.5" />
                <span
                  className="absolute bottom-0.5 right-0.5 size-1.5 rounded-full border border-background"
                  style={{ backgroundColor: laserColor }}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium text-xs">Apontador Laser <span className="opacity-60 text-[10px]">(L)</span></p>
            </TooltipContent>
          </Tooltip>

          {onSelectLaserColor && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsColorOpen((prev) => !prev)}
                  aria-label="Escolher cor do laser"
                  className="size-6 rounded-md flex items-center justify-center hover:bg-muted transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.95] cursor-pointer"
                >
                  <span
                    className="size-3.5 rounded-sm border border-border shadow-2xs"
                    style={{ backgroundColor: laserColor }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium text-xs">Cor do Laser</p>
              </TooltipContent>
            </Tooltip>
          )}

          {isColorOpen && onSelectLaserColor && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 origin-bottom bg-popover text-popover-foreground p-3 rounded-lg shadow-xl border border-border flex flex-col gap-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 w-44">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Cor do Laser
                </span>
                <span className="text-[9px] font-mono text-muted-foreground truncate uppercase max-w-[60px]">
                  {laserColor}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {LASER_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      onSelectLaserColor(c.value);
                      if (!isLaserActive) {
                        onToggleLaser?.();
                      }
                      setIsColorOpen(false);
                    }}
                    className={`size-6 rounded-md transition-transform hover:scale-110 active:scale-95 border cursor-pointer ${
                      laserColor.toLowerCase() === c.value.toLowerCase()
                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                        : 'border-border'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                    aria-label={`Laser ${c.name}`}
                  />
                ))}
                <label
                  className="relative size-6 rounded-md border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 bg-gradient-to-tr from-rose-500 via-indigo-500 to-emerald-400 shadow-xs"
                  title="Escolher qualquer cor personalizada (Hex/RGB)"
                >
                  <Pipette className="size-3 text-white drop-shadow" />
                  <input
                    type="color"
                    value={laserColor.startsWith('#') && laserColor.length === 7 ? laserColor : DEFAULT_LASER_COLOR}
                    onChange={(e) => {
                      onSelectLaserColor(e.target.value);
                      if (!isLaserActive) {
                        onToggleLaser?.();
                      }
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="h-4 w-px bg-border" />

        {/* Botão Sair da Apresentação */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onExitPresentation}
              className="h-7 px-3 text-xs font-semibold gap-1.5 rounded-full bg-primary text-primary-foreground shadow-xs active:scale-[0.97]"
            >
              <Minimize className="size-3.5" />
              <span>Sair (ESC)</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Voltar ao modo edição normal</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
