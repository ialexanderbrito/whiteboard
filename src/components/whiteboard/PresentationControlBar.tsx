import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Minimize, 
  ZoomIn, 
  ZoomOut, 
  Tv,
  Laser
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CanvasElement } from '@/types/element';

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
}) => {
  const [isHovered, setIsHovered] = useState(false);
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
      style={{ opacity: isHovered ? 1 : 0.85 }}
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

        {/* Apontador Laser na Apresentação */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isLaserActive ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={onToggleLaser}
              className={`size-7 rounded-full active:scale-[0.97] transition-all ${
                isLaserActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Laser className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium text-xs">Apontador Laser <span className="opacity-60 text-[10px]">(L)</span></p>
          </TooltipContent>
        </Tooltip>

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
