import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { 
  Trash2, 
  Copy, 
  CopyPlus,
  Scissors,
  Edit3,
  Layers,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  Lock,
  Unlock,
  Check,
  ChevronDown,
  MoreHorizontal,
  Minus,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ExternalLink,
  Globe,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Pipette,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import type { CanvasElement } from '../../types/element';
import { 
  STICKY_COLORS, 
  SHAPE_FILL_CATEGORIES,
  STROKE_CATEGORIES,
  TEXT_CATEGORIES,
  getContrastTextColor 
} from '../../utils/colors';
import { alignElements, type AlignmentType } from '../../utils/alignment';
import { 
  extractAllLinks,
  getDomainFromUrl, 
  normalizeUrl, 
  stripMarkdownLinks,
  addLinkToElement,
  removeLinkFromElement
} from '../../utils/textLinks';
import { Button } from '@/components/ui/button';
import {
  getViewport,
  subscribeViewport,
  type ViewportState,
} from '../../utils/viewport';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface SelectionContextBarProps {
  selectedElements: CanvasElement[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onUpdateElements?: (ids: string[], updates: Partial<CanvasElement>) => void;
  onBatchUpdateElements?: (updates: { id: string; updates: Partial<CanvasElement> }[]) => Promise<void> | void;
  onDeleteElement: (id: string) => void;
  onDeleteElements?: (ids: string[]) => void;
  onDuplicateElement: (element: CanvasElement) => void;
  onDuplicateElements?: (elements: CanvasElement[]) => void;
  onCopyElements?: (elements: CanvasElement[]) => void;
  onCutElements?: (elements: CanvasElement[]) => void;
  onStartEditing?: (element: CanvasElement) => void;
  onReorderLayer?: (action: 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward') => void;
  scale: number;
  stagePos: { x: number; y: number };
  onToggleVote?: (elementId: string) => void;
  onAddVote?: (elementId: string) => void;
  onRemoveVote?: (elementId: string) => void;
  hasUserVoted?: boolean;
  voteCount?: number;
  userElementVotes?: number;
  userRemainingVotes?: number;
  isSessionActive?: boolean;
  isElementEligible?: boolean;
}

interface LockButtonProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  showFullLabel?: boolean;
}

const LockButton: React.FC<LockButtonProps> = ({ isLocked, onUnlock, onLock, showFullLabel = false }) => {
  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const HOLD_DURATION = 800; // 800ms de pressão contínua para desbloquear

  const cleanUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    setIsPressing(false);
    setProgress(0);
  };

  const handleStartHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isLocked) return;
    e.preventDefault();
    e.stopPropagation();

    setIsPressing(true);
    setProgress(0);
    const start = Date.now();
    startTimeRef.current = start;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setProgress(pct);

      if (elapsed >= HOLD_DURATION) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsDone(true);
        setTimeout(() => {
          onUnlock();
          setIsDone(false);
          setProgress(0);
          setIsPressing(false);
        }, 180);
      }
    }, 16);

    const handleRelease = () => {
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchend', handleRelease);
      cleanUp();
    };

    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onMouseDown={handleStartHold}
            onTouchStart={handleStartHold}
            className={`relative flex items-center justify-center h-7 ${
              showFullLabel ? 'px-2.5 gap-1.5' : 'size-7 px-0'
            } rounded-md border border-amber-500/40 bg-amber-500/10 cursor-pointer overflow-hidden select-none transition-colors ${
              isPressing ? 'ring-1 ring-amber-500 shadow-xs' : 'hover:bg-amber-500/15'
            }`}
          >
            {/* Barra linear animada de carregamento preenchendo a div */}
            <div
              className="absolute inset-y-0 left-0 bg-amber-500/35 dark:bg-amber-400/40 transition-none pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            {/* Linha brilhante na base preenchendo a div */}
            <div
              className="absolute bottom-0 left-0 h-[2.5px] bg-amber-500 transition-none pointer-events-none"
              style={{ width: `${progress}%` }}
            />

            {/* Conteúdo sobreposto */}
            <span className="relative z-10 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 pointer-events-none">
              {isDone ? (
                <Unlock className="size-3.5 text-emerald-500" />
              ) : (
                <Lock className="size-3.5 text-amber-500" />
              )}
              {showFullLabel && (
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                  Segure para desbloquear
                </span>
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">Segure pressionado para desbloquear</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLock}
          className="size-7 text-muted-foreground hover:text-foreground rounded"
        >
          <Unlock className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">Bloquear elemento</TooltipContent>
    </Tooltip>
  );
};

export const SelectionContextBar: React.FC<SelectionContextBarProps> = React.memo(({
  selectedElements,
  onUpdateElement,
  onUpdateElements,
  onBatchUpdateElements,
  onDeleteElement,
  onDeleteElements,
  onDuplicateElement,
  onDuplicateElements,
  onCopyElements,
  onCutElements,
  onStartEditing,
  onReorderLayer,
  scale,
  stagePos,
  onAddVote,
  onRemoveVote,
  userElementVotes,
  userRemainingVotes,
  isSessionActive,
  isElementEligible,
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [linkTextLabel, setLinkTextLabel] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isEditingExistingLink, setIsEditingExistingLink] = useState(false);
  const [editingLinkUrl, setEditingLinkUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isFontSizePopoverOpen, setIsFontSizePopoverOpen] = useState(false);
  const [customFontSizeInput, setCustomFontSizeInput] = useState('');
  const [isStrokeWidthPopoverOpen, setIsStrokeWidthPopoverOpen] = useState(false);
  const [customStrokeWidthInput, setCustomStrokeWidthInput] = useState('');
  const [isBatchStrokeWidthPopoverOpen, setIsBatchStrokeWidthPopoverOpen] = useState(false);
  const [customBatchStrokeWidthInput, setCustomBatchStrokeWidthInput] = useState('');
  const [customFillInput, setCustomFillInput] = useState('');
  const [customStrokeInput, setCustomStrokeInput] = useState('');
  const [customTextColorInput, setCustomTextColorInput] = useState('');

  const primaryElement = selectedElements[0];
  const elementLinks = useMemo(() => {
    if (!primaryElement) return [];
    return extractAllLinks(primaryElement.text, primaryElement.linkUrl, primaryElement.links);
  }, [primaryElement, primaryElement?.text, primaryElement?.linkUrl, primaryElement?.links]);

  // Posição flutuante na tela logo acima da seleção (acompanha pan/zoom ao vivo).
  // O deslocamento é escrito direto no DOM durante a navegação: um setState por
  // frame re-renderizaria esta barra (e seus dezenas de controles) a cada wheel.
  const minX = selectedElements.length > 0 ? Math.min(...selectedElements.map((e) => e.x)) : 0;
  const minY = selectedElements.length > 0 ? Math.min(...selectedElements.map((e) => e.y)) : 0;
  const barRef = useRef<HTMLDivElement>(null);
  const barAnchorRef = useRef({ minX, minY });

  const placeBar = useCallback((viewport: ViewportState) => {
    const node = barRef.current;
    if (!node) return;
    const anchor = barAnchorRef.current;
    const screenX = anchor.minX * viewport.scale + viewport.x;
    const screenY = anchor.minY * viewport.scale + viewport.y;
    node.style.left = `${Math.max(16, Math.min(window.innerWidth - 440, screenX))}px`;
    node.style.top = `${Math.max(68, screenY - 48)}px`;
  }, []);

  useEffect(() => {
    placeBar(getViewport());
    return subscribeViewport(placeBar);
  }, [placeBar]);

  useLayoutEffect(() => {
    barAnchorRef.current = { minX, minY };
    placeBar(getViewport());
  }, [minX, minY, placeBar]);

  if (selectedElements.length === 0) return null;

  const allLocked = selectedElements.every((e) => e.locked);
  const someLocked = selectedElements.some((e) => e.locked);

  const screenX = minX * scale + stagePos.x;
  const screenY = minY * scale + stagePos.y;

  const barLeft = Math.max(16, Math.min(window.innerWidth - 440, screenX));
  const barTop = Math.max(68, screenY - 48);

  const isMultiSelect = selectedElements.length > 1;
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const STROKE_WIDTH_PRESETS = [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 48];
  const hasLineOrArrowSelected = selectedElements.some((e) => ['pen', 'line', 'arrow'].includes(e.type));
  const batchStrokeWidth = selectedElements.find((e) => ['pen', 'line', 'arrow'].includes(e.type))?.strokeWidth || 3;

  const handleBatchColor = (color: string) => {
    if (onBatchUpdateElements) {
      const updates = selectedElements.map((e) => ({
        id: e.id,
        updates: ['pen', 'line', 'arrow'].includes(e.type)
          ? { stroke: color }
          : { fill: color },
      }));
      onBatchUpdateElements(updates);
    } else if (onUpdateElements) {
      selectedElements.forEach((e) => {
        if (['pen', 'line', 'arrow'].includes(e.type)) {
          onUpdateElement(e.id, { stroke: color });
        } else {
          onUpdateElement(e.id, { fill: color });
        }
      });
    } else {
      selectedElements.forEach((e) => {
        if (['pen', 'line', 'arrow'].includes(e.type)) {
          onUpdateElement(e.id, { stroke: color });
        } else {
          onUpdateElement(e.id, { fill: color });
        }
      });
    }
  };

  const handleDecrementBatchStrokeWidth = () => {
    selectedElements.forEach((e) => {
      if (['pen', 'line', 'arrow'].includes(e.type)) {
        const cur = e.strokeWidth || 3;
        const prevWidths = STROKE_WIDTH_PRESETS.filter((w) => w < cur);
        const next = prevWidths.length > 0 ? prevWidths[prevWidths.length - 1] : Math.max(1, cur - 1);
        onUpdateElement(e.id, { strokeWidth: next });
      }
    });
  };

  const handleIncrementBatchStrokeWidth = () => {
    selectedElements.forEach((e) => {
      if (['pen', 'line', 'arrow'].includes(e.type)) {
        const cur = e.strokeWidth || 3;
        const nextWidths = STROKE_WIDTH_PRESETS.filter((w) => w > cur);
        const next = nextWidths.length > 0 ? nextWidths[0] : cur + 2;
        onUpdateElement(e.id, { strokeWidth: next });
      }
    });
  };

  const handleSelectBatchStrokeWidth = (w: number) => {
    selectedElements.forEach((e) => {
      if (['pen', 'line', 'arrow'].includes(e.type)) {
        onUpdateElement(e.id, { strokeWidth: w });
      }
    });
    setIsBatchStrokeWidthPopoverOpen(false);
  };

  const handleApplyCustomBatchStrokeWidth = () => {
    const parsed = parseInt(customBatchStrokeWidthInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      selectedElements.forEach((e) => {
        if (['pen', 'line', 'arrow'].includes(e.type)) {
          onUpdateElement(e.id, { strokeWidth: parsed });
        }
      });
      setIsBatchStrokeWidthPopoverOpen(false);
      setCustomBatchStrokeWidthInput('');
    }
  };

  const handleBatchLock = (lockState: boolean) => {
    const ids = selectedElements.map((e) => e.id);
    if (onUpdateElements) {
      onUpdateElements(ids, { locked: lockState });
    } else {
      ids.forEach((id) => onUpdateElement(id, { locked: lockState }));
    }
  };

  const handleBatchDuplicate = () => {
    if (onDuplicateElements) {
      onDuplicateElements(selectedElements);
    } else {
      selectedElements.forEach((e) => onDuplicateElement(e));
    }
  };

  const handleBatchDelete = () => {
    const ids = selectedElements.map((e) => e.id);
    if (onDeleteElements) {
      onDeleteElements(ids);
    } else {
      ids.forEach((id) => onDeleteElement(id));
    }
  };

  const handleAlign = (type: AlignmentType) => {
    const updates = alignElements(selectedElements, type);
    if (updates.length === 0) return;
    if (onBatchUpdateElements) {
      onBatchUpdateElements(updates);
    } else {
      updates.forEach((u) => onUpdateElement(u.id, u.updates));
    }
  };

  // Se múltiplos elementos estiverem selecionados
  if (isMultiSelect) {
    return (
      <div
        ref={barRef}
        className="absolute z-40 flex items-center gap-1.5 bg-popover/95 text-popover-foreground backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm border border-border select-none"
        style={{
          left: `${barLeft}px`,
          top: `${barTop}px`,
        }}
      >
        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 font-medium">
          <Layers className="size-3" />
          <span>{selectedElements.length} selecionados</span>
        </Badge>

        <div className="w-px h-3.5 bg-border mx-0.5" />

        {/* Botão de Bloquear / Desbloquear em Lote com animação linear */}
        <LockButton
          isLocked={allLocked || someLocked}
          onUnlock={() => handleBatchLock(false)}
          onLock={() => handleBatchLock(true)}
        />

        {/* Cores rápidas para aplicar em lote via Popover */}
        <div className="flex items-center pr-1 border-r border-border">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.96]"
                  >
                    <span className="size-4 rounded-md bg-gradient-to-tr from-amber-400 via-rose-400 to-sky-400 border border-border shrink-0" />
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Colorir selecionados</TooltipContent>
            </Tooltip>
            <PopoverContent
              side="top"
              align="start"
              className="w-68 p-2.5 max-h-[380px] overflow-y-auto shadow-xl border-border bg-popover"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
                <span className="font-semibold text-[11px] text-foreground">Colorir Selecionados</span>
                <span className="text-[10px] text-muted-foreground">{selectedElements.length} itens</span>
              </div>

              {/* Categorias de Cores */}
              <div className="space-y-2.5">
                {SHAPE_FILL_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-0.5 tracking-wider">
                      {cat.name}
                    </p>
                    <div className="grid grid-cols-8 gap-1">
                      {cat.colors.map((c) => (
                        <Tooltip key={c.name + c.value}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleBatchColor(c.value)}
                              className="size-5 rounded-md transition-all hover:scale-120 flex items-center justify-center border border-border/80"
                              style={{
                                backgroundColor: c.value === 'transparent' ? 'transparent' : c.value,
                                backgroundImage: c.value === 'transparent' ? 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 0, transparent 4px)' : 'none',
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">{c.name}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Personalizada */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <Pipette className="size-3 text-muted-foreground" />
                  Personalizada:
                </span>
                <input
                  type="color"
                  defaultValue="#3b82f6"
                  onChange={(e) => handleBatchColor(e.target.value)}
                  className="size-6 p-0 border border-border rounded-md cursor-pointer bg-transparent"
                  title="Colorir todos os selecionados com cor personalizada"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Seletor de Espessura em Lote (quando há linhas, setas ou desenhos com caneta) */}
        {hasLineOrArrowSelected && (
          <div className="flex items-center pr-1 border-r border-border">
            <div className="flex items-center bg-muted/40 rounded-md border border-border/60 p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleDecrementBatchStrokeWidth}
                    className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-95"
                    aria-label="Diminuir espessura do traço"
                  >
                    <Minus className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Diminuir espessura (-)</TooltipContent>
              </Tooltip>

              <Popover open={isBatchStrokeWidthPopoverOpen} onOpenChange={setIsBatchStrokeWidthPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="px-1.5 h-5 text-xs font-mono font-semibold flex items-center gap-0.5 text-foreground hover:bg-background rounded transition cursor-pointer"
                        aria-label="Espessura do traço"
                      >
                        <span>{batchStrokeWidth}px</span>
                        <ChevronDown className="size-2.5 opacity-60" />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Espessura dos traços ({batchStrokeWidth}px)</TooltipContent>
                </Tooltip>

                <PopoverContent
                  side="top"
                  align="center"
                  className="w-48 p-2.5 text-xs"
                  onPointerDownOutside={() => {
                    if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
                  }}
                  onInteractOutside={() => {
                    if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
                  }}
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                    <span className="font-semibold text-[11px] text-foreground">Espessura do Traço</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{batchStrokeWidth}px</span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder={`${batchStrokeWidth}`}
                      value={customBatchStrokeWidthInput}
                      onChange={(e) => setCustomBatchStrokeWidthInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyCustomBatchStrokeWidth();
                      }}
                      className="h-7 text-xs px-2 font-mono"
                    />
                    <Button
                      size="icon-sm"
                      onClick={handleApplyCustomBatchStrokeWidth}
                      className="size-7 shrink-0 text-xs font-semibold"
                    >
                      OK
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {STROKE_WIDTH_PRESETS.map((w) => {
                      const isSelected = batchStrokeWidth === w;
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => handleSelectBatchStrokeWidth(w)}
                          className={`h-6 rounded text-[11px] font-mono transition flex items-center justify-center ${
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {w}px
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleIncrementBatchStrokeWidth}
                    className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-95"
                    aria-label="Aumentar espessura do traço"
                  >
                    <Plus className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Aumentar espessura (+)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Opção de Alinhamento dos Elementos Selecionados */}
        <div className="flex items-center pr-1 border-r border-border">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.96] text-muted-foreground hover:text-foreground text-xs"
                    aria-label="Alinhar elementos"
                  >
                    <AlignCenterVertical className="size-3.5 text-primary" />
                    <span className="text-[11px] font-medium hidden sm:inline">Alinhar</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Alinhar e organizar seleção</TooltipContent>
            </Tooltip>
            <PopoverContent
              side="top"
              align="start"
              className="w-60 p-2.5"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Alinhamento Horizontal
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-md">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAlign('left')}
                          className="flex items-center justify-center h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 cursor-pointer"
                          aria-label="Alinhar à esquerda"
                        >
                          <AlignStartVertical className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Alinhar à Esquerda (Alt+A)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAlign('center-horizontal')}
                          className="flex items-center justify-center h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 cursor-pointer"
                          aria-label="Centralizar horizontalmente"
                        >
                          <AlignCenterVertical className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Centralizar Horizontalmente (Alt+H)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAlign('right')}
                          className="flex items-center justify-center h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 cursor-pointer"
                          aria-label="Alinhar à direita"
                        >
                          <AlignEndVertical className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Alinhar à Direita (Alt+D)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Alinhamento Vertical
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-md">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAlign('top')}
                          className="flex items-center justify-center h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 cursor-pointer"
                          aria-label="Alinhar ao topo"
                        >
                          <AlignStartHorizontal className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Alinhar ao Topo (Alt+W)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAlign('center-vertical')}
                          className="flex items-center justify-center h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 cursor-pointer"
                          aria-label="Centralizar verticalmente"
                        >
                          <AlignCenterHorizontal className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Centralizar Verticalmente (Alt+V)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAlign('bottom')}
                          className="flex items-center justify-center h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 cursor-pointer"
                          aria-label="Alinhar à base"
                        >
                          <AlignEndHorizontal className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Alinhar à Base (Alt+S)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Distribuição de Espaço {selectedElements.length < 3 && '(≥ 3 itens)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-muted/40 p-1 rounded-md">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={selectedElements.length < 3}
                          onClick={() => handleAlign('distribute-horizontal')}
                          className="flex items-center justify-center gap-1.5 h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs cursor-pointer"
                          aria-label="Distribuir horizontalmente"
                        >
                          <AlignHorizontalDistributeCenter className="size-3.5" />
                          <span className="text-[10px] font-medium">Horizontal</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {selectedElements.length < 3
                          ? 'Selecione 3 ou mais itens para distribuir'
                          : 'Distribuir espaçamento horizontal'}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={selectedElements.length < 3}
                          onClick={() => handleAlign('distribute-vertical')}
                          className="flex items-center justify-center gap-1.5 h-7 rounded hover:bg-background hover:text-foreground text-muted-foreground transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs cursor-pointer"
                          aria-label="Distribuir verticalmente"
                        >
                          <AlignVerticalDistributeCenter className="size-3.5" />
                          <span className="text-[10px] font-medium">Vertical</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {selectedElements.length < 3
                          ? 'Selecione 3 ou mais itens para distribuir'
                          : 'Distribuir espaçamento vertical'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Ações em lote compactadas */}
        <div className="flex items-center gap-0.5">
          {/* Excluir em lote direto */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleBatchDelete}
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Excluir {selectedElements.length} Selecionados (Del)</TooltipContent>
          </Tooltip>

          {/* Menu de Mais Ações em lote */}
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Mais ações</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side="top"
              align="end"
              className="w-52 p-1"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') {
                  (window as any).__mirio_menu_dismissed_at = Date.now();
                }
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') {
                  (window as any).__mirio_menu_dismissed_at = Date.now();
                }
              }}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem
                onClick={handleBatchDuplicate}
                className="flex items-center justify-between text-xs cursor-pointer py-1.5"
              >
                <span className="flex items-center gap-2">
                  <CopyPlus className="size-3.5 text-muted-foreground" />
                  <span>Duplicar</span>
                </span>
                <kbd className="text-[10px] text-muted-foreground font-mono">{modKey}+D</kbd>
              </DropdownMenuItem>

              {onReorderLayer && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center justify-between text-xs cursor-pointer py-1.5">
                    <span className="flex items-center gap-2">
                      <Layers className="size-3.5 text-muted-foreground" />
                      <span>Organizar camada</span>
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    <DropdownMenuItem onClick={() => onReorderLayer('bringToFront')} className="gap-2 text-xs cursor-pointer">
                      <BringToFront className="size-3.5" />
                      Trazer para frente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReorderLayer('bringForward')} className="gap-2 text-xs cursor-pointer">
                      <ArrowUp className="size-3.5" />
                      Avançar uma camada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReorderLayer('sendBackward')} className="gap-2 text-xs cursor-pointer">
                      <ArrowDown className="size-3.5" />
                      Recuar uma camada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReorderLayer('sendToBack')} className="gap-2 text-xs cursor-pointer">
                      <SendToBack className="size-3.5" />
                      Enviar para trás
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {onCopyElements && (
                <DropdownMenuItem
                  onClick={() => onCopyElements(selectedElements)}
                  className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="size-3.5 text-muted-foreground" />
                    <span>Copiar</span>
                  </span>
                  <kbd className="text-[10px] text-muted-foreground font-mono">{modKey}+C</kbd>
                </DropdownMenuItem>
              )}

              {onCutElements && (
                <DropdownMenuItem
                  onClick={() => onCutElements(selectedElements)}
                  className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                >
                  <span className="flex items-center gap-2">
                    <Scissors className="size-3.5 text-muted-foreground" />
                    <span>Recortar</span>
                  </span>
                  <kbd className="text-[10px] text-muted-foreground font-mono">{modKey}+X</kbd>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Submenu de Alinhamento */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center justify-between text-xs cursor-pointer py-1.5">
                  <span className="flex items-center gap-2">
                    <AlignCenterVertical className="size-3.5 text-muted-foreground" />
                    <span>Alinhar</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 p-1">
                  <DropdownMenuItem
                    onClick={() => handleAlign('left')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <AlignStartVertical className="size-3.5 text-muted-foreground" />
                      <span>Alinhar à Esquerda</span>
                    </span>
                    <kbd className="text-[10px] text-muted-foreground font-mono">Alt+A</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAlign('center-horizontal')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <AlignCenterVertical className="size-3.5 text-muted-foreground" />
                      <span>Centralizar Horizontal</span>
                    </span>
                    <kbd className="text-[10px] text-muted-foreground font-mono">Alt+H</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAlign('right')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <AlignEndVertical className="size-3.5 text-muted-foreground" />
                      <span>Alinhar à Direita</span>
                    </span>
                    <kbd className="text-[10px] text-muted-foreground font-mono">Alt+D</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => handleAlign('top')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <AlignStartHorizontal className="size-3.5 text-muted-foreground" />
                      <span>Alinhar ao Topo</span>
                    </span>
                    <kbd className="text-[10px] text-muted-foreground font-mono">Alt+W</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAlign('center-vertical')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <AlignCenterHorizontal className="size-3.5 text-muted-foreground" />
                      <span>Centralizar Vertical</span>
                    </span>
                    <kbd className="text-[10px] text-muted-foreground font-mono">Alt+V</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleAlign('bottom')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <AlignEndHorizontal className="size-3.5 text-muted-foreground" />
                      <span>Alinhar à Base</span>
                    </span>
                    <kbd className="text-[10px] text-muted-foreground font-mono">Alt+S</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    disabled={selectedElements.length < 3}
                    onClick={() => handleAlign('distribute-horizontal')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5 disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2">
                      <AlignHorizontalDistributeCenter className="size-3.5 text-muted-foreground" />
                      <span>Distribuir Horizontal</span>
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    disabled={selectedElements.length < 3}
                    onClick={() => handleAlign('distribute-vertical')}
                    className="flex items-center justify-between text-xs cursor-pointer py-1.5 disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2">
                      <AlignVerticalDistributeCenter className="size-3.5 text-muted-foreground" />
                      <span>Distribuir Vertical</span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleBatchDelete}
                className="flex items-center justify-between text-xs cursor-pointer py-1.5 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="size-3.5" />
                  <span>Excluir</span>
                </span>
                <kbd className="text-[10px] text-destructive/80 font-mono">Del</kbd>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Elemento único selecionado (mesmo contêiner para bloqueado ou desbloqueado)
  const isSticky = primaryElement.type === 'sticky';
  const isShape = ['rect', 'circle', 'diamond', 'triangle', 'star'].includes(primaryElement.type);
  const isLineOrArrow = ['arrow', 'line', 'pen'].includes(primaryElement.type);
  const isText = primaryElement.type === 'text';
  const isFrame = primaryElement.type === 'frame';
  // Formatação tipográfica na barra para texto livre, post-its e formas
  const hasTextFormatting = isSticky || isText || isShape;
  const isLocked = Boolean(primaryElement.locked);

  const activeTextColor =
    primaryElement.textColor ||
    (isText
      ? (primaryElement.fill || '#0f172a')
      : getContrastTextColor(primaryElement.fill || (isSticky ? '#fff9b1' : '#ffffff'), '#0f172a', '#ffffff'));

  const handleSetTextColor = (colorVal: string | undefined) => {
    if (isText) {
      onUpdateElement(primaryElement.id, { textColor: colorVal, fill: colorVal });
    } else {
      onUpdateElement(primaryElement.id, { textColor: colorVal });
    }
  };

  const isBold = primaryElement.fontWeight === 'bold';
  const isItalic = primaryElement.fontStyle === 'italic';
  const isUnderline = primaryElement.textDecoration?.includes('underline');
  const isStrikethrough = primaryElement.textDecoration?.includes('line-through');

  const handleToggleBold = () => {
    onUpdateElement(primaryElement.id, {
      fontWeight: isBold ? 'normal' : 'bold',
    });
  };

  const handleToggleItalic = () => {
    onUpdateElement(primaryElement.id, {
      fontStyle: isItalic ? 'normal' : 'italic',
    });
  };

  const handleToggleUnderline = () => {
    const next = isUnderline
      ? isStrikethrough ? 'line-through' : 'none'
      : isStrikethrough ? 'underline line-through' : 'underline';
    onUpdateElement(primaryElement.id, { textDecoration: next });
  };

  const handleToggleStrikethrough = () => {
    const next = isStrikethrough
      ? isUnderline ? 'underline' : 'none'
      : isUnderline ? 'underline line-through' : 'line-through';
    onUpdateElement(primaryElement.id, { textDecoration: next });
  };

  const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 80, 96, 120, 144];
  const currentFontSize = primaryElement.fontSize || (isSticky ? 14 : isShape ? 16 : 20);
  const currentTextAlign = primaryElement.textAlign || (isShape ? 'center' : 'left');

  const handleSelectFontSize = (sz: number) => {
    onUpdateElement(primaryElement.id, { fontSize: sz });
    setIsFontSizePopoverOpen(false);
  };

  const handleApplyCustomFontSize = () => {
    const parsed = parseInt(customFontSizeInput, 10);
    if (!isNaN(parsed) && parsed >= 8 && parsed <= 300) {
      onUpdateElement(primaryElement.id, { fontSize: parsed });
      setIsFontSizePopoverOpen(false);
      setCustomFontSizeInput('');
    }
  };

  const currentStrokeWidth = primaryElement.strokeWidth || (primaryElement.type === 'pen' ? 3 : 2);

  const handleSelectStrokeWidth = (w: number) => {
    onUpdateElement(primaryElement.id, { strokeWidth: w });
    setIsStrokeWidthPopoverOpen(false);
  };

  const handleApplyCustomStrokeWidth = () => {
    const parsed = parseInt(customStrokeWidthInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      onUpdateElement(primaryElement.id, { strokeWidth: parsed });
      setIsStrokeWidthPopoverOpen(false);
      setCustomStrokeWidthInput('');
    }
  };

  const handleSaveLink = () => {
    const trimmedUrl = linkInput.trim();
    if (!trimmedUrl) {
      if (editingLinkUrl) {
        handleRemoveLink(editingLinkUrl);
      }
      return;
    }

    const norm = normalizeUrl(trimmedUrl);
    const { linkUrl, links } = addLinkToElement(
      primaryElement.linkUrl,
      primaryElement.links,
      norm,
      linkTextLabel.trim() || undefined
    );

    onUpdateElement(primaryElement.id, {
      linkUrl,
      links,
      text: stripMarkdownLinks(primaryElement.text || ''),
    });

    if (typeof window !== 'undefined') {
      (window as any).__mirio_active_text_selection = null;
    }
    setIsLinkPopoverOpen(false);
    setIsEditingExistingLink(false);
    setEditingLinkUrl(null);
    setLinkInput('');
    setLinkTextLabel('');
  };

  const handleRemoveLink = (targetUrl?: string) => {
    const { linkUrl, links } = removeLinkFromElement(
      primaryElement.linkUrl,
      primaryElement.links,
      targetUrl
    );

    onUpdateElement(primaryElement.id, {
      linkUrl,
      links,
      text: stripMarkdownLinks(primaryElement.text || ''),
    });

    setLinkInput('');
    setLinkTextLabel('');
    setEditingLinkUrl(null);
    setIsEditingExistingLink(false);
    if (elementLinks.length <= 1) {
      setIsLinkPopoverOpen(false);
    }
  };

  const renderLinkPopover = () => (
    <Popover
      open={isLinkPopoverOpen}
      onOpenChange={(open) => {
        setIsLinkPopoverOpen(open);
        if (open) {
          const activeSel = typeof window !== 'undefined' ? (window as any).__mirio_active_text_selection : null;
          if (activeSel && activeSel.elementId === primaryElement?.id && activeSel.text) {
            setLinkTextLabel(activeSel.text);
            setLinkInput('');
            setEditingLinkUrl(null);
            setIsEditingExistingLink(true);
          } else if (elementLinks.length === 1) {
            setLinkInput(elementLinks[0].url);
            setLinkTextLabel(elementLinks[0].label || '');
            setEditingLinkUrl(elementLinks[0].url);
            setIsEditingExistingLink(false);
          } else {
            setEditingLinkUrl(null);
            setIsEditingExistingLink(elementLinks.length === 0);
          }
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={`h-7 px-1.5 rounded gap-0.5 ${
                elementLinks.length > 0
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 className="size-3.5" />
              {elementLinks.length > 1 && (
                <span className="text-[10px] font-bold leading-none">{elementLinks.length}</span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          {elementLinks.length > 1
            ? `${elementLinks.length} Links no elemento`
            : elementLinks.length === 1
            ? `Link: ${getDomainFromUrl(elementLinks[0].url)}`
            : 'Inserir Hiperlink (Ctrl+L no texto)'}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="center"
        className="w-80 p-3 text-xs shadow-xl rounded-xl border-border bg-popover"
        onPointerDownOutside={() => {
          if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
        }}
        onInteractOutside={() => {
          if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
        }}
      >
        {!isEditingExistingLink && elementLinks.length > 1 ? (
          /* Lista de múltiplos hiperlinks no elemento */
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Globe className="size-3.5 text-blue-500" />
                <span>Hiperlinks ({elementLinks.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  elementLinks.forEach((l) => window.open(l.url, '_blank', 'noopener,noreferrer'));
                }}
                className="h-6 px-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                title="Abrir todos os links em novas abas"
              >
                Abrir todos ↗
              </Button>
            </div>

            <div className="space-y-1.5">
              {elementLinks.map((linkItem, idx) => (
                <div key={`${linkItem.url}-${idx}`} className="p-2 rounded-lg bg-muted/40 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                      {linkItem.label || getDomainFromUrl(linkItem.url)}
                    </p>
                    <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0">
                      {getDomainFromUrl(linkItem.url)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{linkItem.url}</p>
                  <div className="flex items-center justify-end gap-1 pt-0.5">
                    <Button
                      size="sm"
                      onClick={() => window.open(linkItem.url, '_blank', 'noopener,noreferrer')}
                      className="h-6 px-2 text-[10px] gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ExternalLink className="size-2.5" />
                      <span>Abrir</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(linkItem.url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="h-6 px-1.5 text-[10px]"
                      title="Copiar URL"
                    >
                      <Copy className="size-2.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingLinkUrl(linkItem.url);
                        setLinkInput(linkItem.url);
                        setLinkTextLabel(linkItem.label || '');
                        setIsEditingExistingLink(true);
                      }}
                      className="h-6 px-1.5 text-[10px]"
                      title="Editar Link"
                    >
                      <Edit3 className="size-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLink(linkItem.url)}
                      className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                      title="Remover Link"
                    >
                      <Trash2 className="size-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingLinkUrl(null);
                setLinkInput('');
                setLinkTextLabel('');
                setIsEditingExistingLink(true);
              }}
              className="w-full h-7 text-xs font-medium gap-1 text-primary hover:bg-primary/10 mt-1"
            >
              <Plus className="size-3" />
              <span>Adicionar outro hiperlink</span>
            </Button>
          </div>
        ) : !isEditingExistingLink && elementLinks.length === 1 ? (
          /* Card de Prévia de link único Estilo Miro */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Globe className="size-3.5 text-blue-500" />
                <span>Hiperlink</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                {getDomainFromUrl(elementLinks[0].url)}
              </Badge>
            </div>

            <div className="p-2 rounded-lg bg-muted/50 border border-border/60">
              {elementLinks[0].label && (
                <p className="font-semibold text-xs text-foreground mb-0.5 truncate">
                  {elementLinks[0].label}
                </p>
              )}
              <a
                href={elementLinks[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline break-all line-clamp-2 block"
              >
                {elementLinks[0].url}
              </a>
            </div>

            <div className="flex items-center justify-between gap-1 pt-0.5">
              <Button
                size="sm"
                onClick={() => window.open(elementLinks[0].url, '_blank', 'noopener,noreferrer')}
                className="h-7 text-xs flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ExternalLink className="size-3" />
                <span>Abrir Link</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(elementLinks[0].url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="h-7 px-2 text-xs"
                title="Copiar URL"
              >
                {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingLinkUrl(elementLinks[0].url);
                  setLinkInput(elementLinks[0].url);
                  setLinkTextLabel(elementLinks[0].label || '');
                  setIsEditingExistingLink(true);
                }}
                className="h-7 px-2 text-xs"
                title="Editar URL"
              >
                <Edit3 className="size-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveLink(elementLinks[0].url)}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Remover Link"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>

            {(isText || isSticky || isShape) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingLinkUrl(null);
                  setLinkInput('');
                  setLinkTextLabel('');
                  setIsEditingExistingLink(true);
                }}
                className="w-full h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 border border-dashed border-border"
              >
                <Plus className="size-2.5" />
                <span>Adicionar outro link neste elemento</span>
              </Button>
            )}
          </div>
        ) : (
          /* Formulário de Inserção / Edição de Link */
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="font-semibold text-[11px] text-foreground">
                {editingLinkUrl ? 'Editar Hiperlink' : 'Inserir Hiperlink'}
              </span>
              {elementLinks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingExistingLink(false);
                    setEditingLinkUrl(null);
                  }}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  Cancelar
                </button>
              )}
            </div>

            {(isText || isSticky || isShape) && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                  Texto de exibição (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Clique aqui"
                  value={linkTextLabel}
                  onChange={(e) => setLinkTextLabel(e.target.value)}
                  className="h-7 text-xs px-2"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                Endereço web (URL)
              </label>
              <div className="flex items-center gap-1">
                <Input
                  type="url"
                  placeholder="https://exemplo.com"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLink();
                  }}
                  className="h-7 text-xs px-2"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveLink} className="h-7 px-2.5 shrink-0 text-xs font-semibold">
                  Salvar
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-tight pt-1">
              {(isText || isSticky || isShape)
                ? 'No texto, selecione qualquer palavra e pressione Ctrl+L para criar um link instantâneo.'
                : 'Insira a URL que será vinculada ao elemento.'}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div
      ref={barRef}
      className="absolute z-40 flex items-center gap-1 bg-popover/95 text-popover-foreground backdrop-blur-md px-1.5 py-1 rounded-xl shadow-md border border-border select-none"
      style={{
        left: `${barLeft}px`,
        top: `${barTop}px`,
      }}
    >
      {/* ========================================================= */}
      {/* SLOT 1: CORES E APARÊNCIA                                 */}
      {/* ========================================================= */}

      {/* 1.1 Post-it: 1 botão compacto com preview da cor atual */}
      {isSticky && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-1.5 h-7 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.97]"
                  aria-label="Cor do post-it"
                >
                  <span
                    className="size-4 rounded-md border border-black/15 shadow-2xs shrink-0"
                    style={{ backgroundColor: primaryElement.fill || '#fff9b1' }}
                  />
                  <ChevronDown className="size-2.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Cor do Post-it</TooltipContent>
          </Tooltip>
          <PopoverContent
            side="top"
            align="start"
            className="w-68 p-2.5 shadow-xl border-border bg-popover"
            onPointerDownOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
            onInteractOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
              <span className="font-semibold text-[11px] text-foreground">Cor do Post-it</span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase">
                {primaryElement.fill || '#fff9b1'}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 px-0.5 tracking-wider">Cores Clássicas</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {STICKY_COLORS.map((c) => {
                const isCurrent = (primaryElement.fill || '#fff9b1').toLowerCase() === c.value.toLowerCase();
                return (
                  <Tooltip key={c.value}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onUpdateElement(primaryElement.id, { fill: c.value })}
                        className={`size-6 rounded-md transition-all hover:scale-115 flex items-center justify-center border ${
                          isCurrent
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                            : 'border-black/10'
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {isCurrent && <Check className="size-3 text-foreground" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{c.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Personalizada */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Pipette className="size-3 text-muted-foreground" />
                Personalizada:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={primaryElement.fill && primaryElement.fill.startsWith('#') && primaryElement.fill.length === 7 ? primaryElement.fill : '#fff9b1'}
                  onChange={(e) => onUpdateElement(primaryElement.id, { fill: e.target.value })}
                  className="size-6 p-0 border border-border rounded-md cursor-pointer bg-transparent"
                  title="Escolher qualquer cor hexadecimal"
                />
                <input
                  type="text"
                  maxLength={7}
                  placeholder="#fff9b1"
                  value={customFillInput !== '' ? customFillInput : (primaryElement.fill?.startsWith('#') ? primaryElement.fill : '')}
                  onChange={(e) => setCustomFillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customFillInput.startsWith('#') && (customFillInput.length === 4 || customFillInput.length === 7)) {
                      onUpdateElement(primaryElement.id, { fill: customFillInput });
                      setCustomFillInput('');
                    }
                  }}
                  onBlur={() => {
                    if (customFillInput.startsWith('#') && (customFillInput.length === 4 || customFillInput.length === 7)) {
                      onUpdateElement(primaryElement.id, { fill: customFillInput });
                    }
                    setCustomFillInput('');
                  }}
                  className="w-16 h-6 text-[10px] font-mono px-1 rounded-md border border-border bg-background"
                  title="Digitar código hex e pressionar Enter"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* 1.2 Formas: Cor de Preenchimento + Cor de Borda */}
      {isShape && (
        <div className="flex items-center gap-0.5">
          {/* Preenchimento */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-1.5 h-7 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.97]"
                    aria-label="Cor de preenchimento"
                  >
                    <span
                      className="size-4 rounded-md border border-black/15 shadow-2xs shrink-0"
                      style={{
                        backgroundColor: primaryElement.fill === 'transparent' ? 'transparent' : (primaryElement.fill || '#ffffff'),
                        backgroundImage: primaryElement.fill === 'transparent' ? 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 0, transparent 4px)' : 'none',
                      }}
                    />
                    <ChevronDown className="size-2.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Preenchimento</TooltipContent>
            </Tooltip>
            <PopoverContent
              side="top"
              align="start"
              className="w-68 p-2.5 max-h-[380px] overflow-y-auto shadow-xl border-border bg-popover"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
                <span className="font-semibold text-[11px] text-foreground">Preenchimento</span>
                <button
                  type="button"
                  onClick={() => onUpdateElement(primaryElement.id, { fill: 'transparent' })}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition cursor-pointer border ${
                    primaryElement.fill === 'transparent'
                      ? 'bg-primary text-primary-foreground border-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground border-border bg-muted/40'
                  }`}
                  title="Tornar o preenchimento transparente"
                >
                  Sem Fundo
                </button>
              </div>

              {/* Categorias de Cores */}
              <div className="space-y-2.5">
                {SHAPE_FILL_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-0.5 tracking-wider">
                      {cat.name}
                    </p>
                    <div className="grid grid-cols-8 gap-1">
                      {cat.colors.map((c) => {
                        const isCurrent = (primaryElement.fill || '#ffffff').toLowerCase() === c.value.toLowerCase();
                        return (
                          <Tooltip key={c.name + c.value}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onUpdateElement(primaryElement.id, { fill: c.value })}
                                className={`size-5 rounded-md transition-all hover:scale-120 flex items-center justify-center border ${
                                  isCurrent
                                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105'
                                    : 'border-border/80'
                                }`}
                                style={{
                                  backgroundColor: c.value === 'transparent' ? 'transparent' : c.value,
                                  backgroundImage: c.value === 'transparent' ? 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 0, transparent 4px)' : 'none',
                                }}
                              >
                                {isCurrent && (
                                  <Check
                                    className="size-2.5"
                                    style={{
                                      color: ['#ffffff', 'transparent', '#fef08a', '#bae6fd', '#bbf7d0', '#fef3c7', '#fed7aa', '#fce7f3', '#fbcfe8', '#e9d5ff', '#ddd6fe', '#e0f2fe', '#cffafe', '#d9f99d', '#ccfbf1'].includes(c.value.toLowerCase())
                                        ? '#0f172a'
                                        : '#ffffff',
                                    }}
                                  />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{c.name}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Personalizada */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <Pipette className="size-3 text-muted-foreground" />
                  Personalizada:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={primaryElement.fill && primaryElement.fill.startsWith('#') && primaryElement.fill.length === 7 ? primaryElement.fill : '#ffffff'}
                    onChange={(e) => onUpdateElement(primaryElement.id, { fill: e.target.value })}
                    className="size-6 p-0 border border-border rounded cursor-pointer bg-transparent"
                    title="Escolher qualquer cor hexadecimal"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="#ffffff"
                    value={customFillInput !== '' ? customFillInput : (primaryElement.fill?.startsWith('#') ? primaryElement.fill : '')}
                    onChange={(e) => setCustomFillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customFillInput.startsWith('#') && (customFillInput.length === 4 || customFillInput.length === 7)) {
                        onUpdateElement(primaryElement.id, { fill: customFillInput });
                        setCustomFillInput('');
                      }
                    }}
                    onBlur={() => {
                      if (customFillInput.startsWith('#') && (customFillInput.length === 4 || customFillInput.length === 7)) {
                        onUpdateElement(primaryElement.id, { fill: customFillInput });
                      }
                      setCustomFillInput('');
                    }}
                    className="w-16 h-6 text-[10px] font-mono px-1 rounded border border-border bg-background"
                    title="Digitar código hex e pressionar Enter"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Borda */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-1.5 h-7 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.97]"
                    aria-label="Cor da borda"
                  >
                    <span
                      className="size-4 rounded-md border border-black/15 shadow-2xs shrink-0"
                      style={{ backgroundColor: primaryElement.stroke || '#334155' }}
                    />
                    <ChevronDown className="size-2.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Cor da Borda</TooltipContent>
            </Tooltip>
            <PopoverContent
              side="top"
              align="start"
              className="w-68 p-2.5 max-h-[380px] overflow-y-auto shadow-xl border-border bg-popover"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
                <span className="font-semibold text-[11px] text-foreground">Cor da Borda</span>
                <button
                  type="button"
                  onClick={() => onUpdateElement(primaryElement.id, { stroke: 'transparent' })}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition cursor-pointer border ${
                    primaryElement.stroke === 'transparent'
                      ? 'bg-primary text-primary-foreground border-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground border-border bg-muted/40'
                  }`}
                  title="Remover a borda"
                >
                  Sem Borda
                </button>
              </div>

              {/* Categorias de Cores da Borda */}
              <div className="space-y-2.5">
                {STROKE_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-0.5 tracking-wider">
                      {cat.name}
                    </p>
                    <div className="grid grid-cols-8 gap-1">
                      {cat.colors.map((c) => {
                        const isCurrent = (primaryElement.stroke || '#334155').toLowerCase() === c.value.toLowerCase();
                        return (
                          <Tooltip key={c.name + c.value}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onUpdateElement(primaryElement.id, { stroke: c.value })}
                                className={`size-5 rounded-md transition-all hover:scale-120 flex items-center justify-center border ${
                                  isCurrent
                                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105'
                                    : 'border-border/80'
                                }`}
                                style={{ backgroundColor: c.value }}
                              >
                                {isCurrent && (
                                  <Check
                                    className="size-2.5"
                                    style={{
                                      color: ['#ffffff', 'transparent', '#fef08a', '#bae6fd', '#bbf7d0', '#fef3c7', '#fed7aa', '#fce7f3', '#fbcfe8', '#e9d5ff', '#ddd6fe', '#e0f2fe', '#cffafe', '#d9f99d', '#ccfbf1', '#f1f5f9', '#e2e8f0', '#cbd5e1'].includes(c.value.toLowerCase())
                                        ? '#0f172a'
                                        : '#ffffff',
                                    }}
                                  />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{c.name}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Personalizada */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <Pipette className="size-3 text-muted-foreground" />
                  Personalizada:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={primaryElement.stroke && primaryElement.stroke.startsWith('#') && primaryElement.stroke.length === 7 ? primaryElement.stroke : '#334155'}
                    onChange={(e) => onUpdateElement(primaryElement.id, { stroke: e.target.value })}
                    className="size-6 p-0 border border-border rounded-md cursor-pointer bg-transparent"
                    title="Escolher qualquer cor hexadecimal de borda"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="#334155"
                    value={customStrokeInput !== '' ? customStrokeInput : (primaryElement.stroke?.startsWith('#') ? primaryElement.stroke : '')}
                    onChange={(e) => setCustomStrokeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customStrokeInput.startsWith('#') && (customStrokeInput.length === 4 || customStrokeInput.length === 7)) {
                        onUpdateElement(primaryElement.id, { stroke: customStrokeInput });
                        setCustomStrokeInput('');
                      }
                    }}
                    onBlur={() => {
                      if (customStrokeInput.startsWith('#') && (customStrokeInput.length === 4 || customStrokeInput.length === 7)) {
                        onUpdateElement(primaryElement.id, { stroke: customStrokeInput });
                      }
                      setCustomStrokeInput('');
                    }}
                    className="w-16 h-6 text-[10px] font-mono px-1 rounded-md border border-border bg-background"
                    title="Digitar código hex e pressionar Enter"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* 1.3 Traço (Caneta / Linha / Seta): 1 botão com preview de cor */}
      {isLineOrArrow && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-1.5 h-7 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.97]"
                  aria-label="Cor do traço"
                >
                  <span
                    className="size-4 rounded-md border border-black/15 shadow-2xs shrink-0"
                    style={{ backgroundColor: primaryElement.stroke || (primaryElement.type === 'arrow' ? '#2563eb' : '#0f172a') }}
                  />
                  <ChevronDown className="size-2.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Cor do Traço</TooltipContent>
          </Tooltip>
          <PopoverContent
            side="top"
            align="start"
            className="w-68 p-2.5 max-h-[380px] overflow-y-auto shadow-xl border-border bg-popover"
            onPointerDownOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
            onInteractOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
              <span className="font-semibold text-[11px] text-foreground">Cor do Traço</span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase">
                {primaryElement.stroke || (primaryElement.type === 'arrow' ? '#2563eb' : '#0f172a')}
              </span>
            </div>

            {/* Categorias de Cores do Traço */}
            <div className="space-y-2.5">
              {STROKE_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-0.5 tracking-wider">
                    {cat.name}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {cat.colors.map((c) => {
                      const activeStroke = primaryElement.stroke || (primaryElement.type === 'arrow' ? '#2563eb' : '#0f172a');
                      const isCurrent = activeStroke.toLowerCase() === c.value.toLowerCase();
                      return (
                        <Tooltip key={c.name + c.value}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onUpdateElement(primaryElement.id, { stroke: c.value })}
                              className={`size-5 rounded-md transition-all hover:scale-120 flex items-center justify-center border ${
                                isCurrent
                                  ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105'
                                  : 'border-border/80'
                              }`}
                              style={{ backgroundColor: c.value }}
                            >
                              {isCurrent && (
                                <Check
                                  className="size-2.5"
                                  style={{
                                    color: ['#ffffff', 'transparent', '#fef08a', '#bae6fd', '#bbf7d0', '#fef3c7', '#fed7aa', '#fce7f3', '#fbcfe8', '#e9d5ff', '#ddd6fe', '#e0f2fe', '#cffafe', '#d9f99d', '#ccfbf1', '#f1f5f9', '#e2e8f0', '#cbd5e1'].includes(c.value.toLowerCase())
                                      ? '#0f172a'
                                      : '#ffffff',
                                  }}
                                />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{c.name}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Personalizada */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Pipette className="size-3 text-muted-foreground" />
                Personalizada:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={
                    primaryElement.stroke && primaryElement.stroke.startsWith('#') && primaryElement.stroke.length === 7
                      ? primaryElement.stroke
                      : primaryElement.type === 'arrow'
                      ? '#2563eb'
                      : '#0f172a'
                  }
                  onChange={(e) => onUpdateElement(primaryElement.id, { stroke: e.target.value })}
                  className="size-6 p-0 border border-border rounded-md cursor-pointer bg-transparent"
                  title="Escolher qualquer cor personalizada"
                />
                <input
                  type="text"
                  maxLength={7}
                  placeholder={primaryElement.type === 'arrow' ? '#2563eb' : '#0f172a'}
                  value={customStrokeInput !== '' ? customStrokeInput : (primaryElement.stroke?.startsWith('#') ? primaryElement.stroke : '')}
                  onChange={(e) => setCustomStrokeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customStrokeInput.startsWith('#') && (customStrokeInput.length === 4 || customStrokeInput.length === 7)) {
                      onUpdateElement(primaryElement.id, { stroke: customStrokeInput });
                      setCustomStrokeInput('');
                    }
                  }}
                  onBlur={() => {
                    if (customStrokeInput.startsWith('#') && (customStrokeInput.length === 4 || customStrokeInput.length === 7)) {
                      onUpdateElement(primaryElement.id, { stroke: customStrokeInput });
                    }
                    setCustomStrokeInput('');
                  }}
                  className="w-16 h-6 text-[10px] font-mono px-1 rounded-md border border-border bg-background"
                  title="Digitar código hex e pressionar Enter"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* 1.4 Moldura / Raia: 1 botão com preview do tema */}
      {isFrame && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 h-7 rounded-md hover:bg-muted transition cursor-pointer border border-transparent hover:border-border active:scale-[0.97]"
                  aria-label="Tema da Moldura"
                >
                  <span
                    className="size-4 rounded-md border border-black/15 shadow-2xs shrink-0"
                    style={{ backgroundColor: primaryElement.stroke || '#94a3b8' }}
                  />
                  <span className="text-[11px] font-medium text-foreground hidden sm:inline">Tema</span>
                  <ChevronDown className="size-2.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Tema da Moldura / Raia</TooltipContent>
          </Tooltip>
          <PopoverContent
            side="top"
            align="start"
            className="w-56 p-2 text-xs shadow-xl border-border bg-popover"
            onPointerDownOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
            onInteractOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 px-0.5">Tema da Raia</p>
            <div className="space-y-1">
              {[
                { name: 'Cinza / Padrão', stroke: '#94a3b8', fill: 'rgba(241, 245, 249, 0.45)' },
                { name: 'Azul / Em Progresso', stroke: '#3b82f6', fill: 'rgba(239, 246, 255, 0.45)' },
                { name: 'Roxo / Revisão', stroke: '#a855f7', fill: 'rgba(253, 244, 255, 0.45)' },
                { name: 'Verde / Concluído', stroke: '#10b981', fill: 'rgba(240, 253, 244, 0.45)' },
                { name: 'Âmbar / Atenção', stroke: '#f59e0b', fill: 'rgba(255, 251, 235, 0.45)' },
                { name: 'Vermelho / Impedimento', stroke: '#ef4444', fill: 'rgba(254, 242, 242, 0.45)' },
              ].map((c) => {
                const isCurrent = primaryElement.stroke === c.stroke;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => onUpdateElement(primaryElement.id, { stroke: c.stroke, fill: c.fill })}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition cursor-pointer ${
                      isCurrent ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 rounded-md border border-black/10" style={{ backgroundColor: c.stroke }} />
                      <span>{c.name}</span>
                    </span>
                    {isCurrent && <Check className="size-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Divisor após Aparência se houver próximo slot */}
      {(isSticky || isShape || isLineOrArrow || isFrame) && (
        <div className="w-px h-3.5 bg-border mx-0.5" />
      )}

      {/* ========================================================= */}
      {/* SLOT 2: TIPOGRAFIA (Miro / FigJam)                        */}
      {/* ========================================================= */}
      {hasTextFormatting && (
        <div className="flex items-center gap-0.5">
          {/* 2.1 Tamanho da Fonte (Pílula Única Dropdown) */}
          <Popover open={isFontSizePopoverOpen} onOpenChange={setIsFontSizePopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-7 px-1.5 text-xs font-mono font-semibold flex items-center gap-1 text-foreground hover:bg-muted rounded-md transition cursor-pointer active:scale-[0.97]"
                    aria-label="Tamanho da fonte"
                  >
                    <span className="tabular-nums">{currentFontSize}</span>
                    <ChevronDown className="size-2.5 opacity-60" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Tamanho do texto ({currentFontSize}px)</TooltipContent>
            </Tooltip>

            <PopoverContent
              side="top"
              align="center"
              className="w-48 p-2.5 text-xs shadow-xl border-border bg-popover"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                <span className="font-semibold text-[11px] text-foreground">Tamanho da Fonte</span>
                <span className="text-[10px] text-muted-foreground font-mono">{currentFontSize}px</span>
              </div>

              {/* Campo Numérico Livre */}
              <div className="flex items-center gap-1 mb-2">
                <Input
                  type="number"
                  min={8}
                  max={300}
                  placeholder={`${currentFontSize}`}
                  value={customFontSizeInput}
                  onChange={(e) => setCustomFontSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyCustomFontSize();
                  }}
                  className="h-7 text-xs px-2 font-mono"
                />
                <Button
                  size="icon-sm"
                  onClick={handleApplyCustomFontSize}
                  className="size-7 shrink-0 text-xs font-semibold"
                >
                  OK
                </Button>
              </div>

              {/* Grade de Tamanhos Rápidos (Miro Presets) */}
              <div className="grid grid-cols-4 gap-1">
                {FONT_SIZES.map((sz) => {
                  const isSelected = currentFontSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleSelectFontSize(sz)}
                      className={`h-6 rounded text-[11px] font-mono transition flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* 2.2 Negrito Direto na Barra */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleBold}
                className={`size-7 rounded-md transition active:scale-[0.97] ${
                  isBold ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Bold className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Negrito ({modKey}+B)</TooltipContent>
          </Tooltip>

          {/* 2.3 Cor do Texto (1 botão com indicador de cor) */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative size-7 flex flex-col items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-[0.97]"
                    aria-label="Cor do texto"
                  >
                    <span className="font-serif font-bold text-xs leading-none">A</span>
                    <span
                      className="w-3.5 h-[2.5px] rounded-xs mt-0.5 border border-black/10"
                      style={{ backgroundColor: activeTextColor }}
                    />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Cor do Texto</TooltipContent>
            </Tooltip>

            <PopoverContent
              side="top"
              align="center"
              className="w-68 p-2.5 max-h-[380px] overflow-y-auto shadow-xl border-border bg-popover"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border">
                <span className="font-semibold text-[11px] text-foreground">Cor do Texto</span>
                <button
                  type="button"
                  onClick={() => handleSetTextColor(undefined)}
                  className="text-[10px] px-1.5 py-0.5 rounded transition cursor-pointer border text-muted-foreground hover:text-foreground border-border bg-muted/40"
                  title="Restaurar cor padrão automática"
                >
                  Padrão
                </button>
              </div>

              {/* Categorias de Cores do Texto */}
              <div className="space-y-2.5">
                {TEXT_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-0.5 tracking-wider">
                      {cat.name}
                    </p>
                    <div className="grid grid-cols-8 gap-1">
                      {cat.colors.map((c) => {
                        const isCurrent = activeTextColor.toLowerCase() === c.value.toLowerCase();
                        return (
                          <Tooltip key={c.name + c.value}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleSetTextColor(c.value)}
                                className={`size-5 rounded-md transition-all hover:scale-120 flex items-center justify-center border ${
                                  isCurrent
                                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105'
                                    : 'border-border/80'
                                }`}
                                style={{ backgroundColor: c.value }}
                              >
                                {isCurrent && (
                                  <Check
                                    className="size-2.5"
                                    style={{
                                      color: ['#ffffff', 'transparent', '#fef08a', '#bae6fd', '#bbf7d0', '#fef3c7', '#fed7aa', '#fce7f3', '#fbcfe8', '#e9d5ff', '#ddd6fe', '#e0f2fe', '#cffafe', '#d9f99d', '#ccfbf1', '#f1f5f9', '#e2e8f0', '#cbd5e1'].includes(c.value.toLowerCase())
                                        ? '#0f172a'
                                        : '#ffffff',
                                    }}
                                  />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{c.name}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Personalizada */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <Pipette className="size-3 text-muted-foreground" />
                  Personalizada:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={activeTextColor && activeTextColor.startsWith('#') && activeTextColor.length === 7 ? activeTextColor : '#0f172a'}
                    onChange={(e) => handleSetTextColor(e.target.value)}
                    className="size-6 p-0 border border-border rounded-md cursor-pointer bg-transparent"
                    title="Escolher qualquer cor hexadecimal"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="#0f172a"
                    value={customTextColorInput !== '' ? customTextColorInput : (activeTextColor.startsWith('#') ? activeTextColor : '')}
                    onChange={(e) => setCustomTextColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customTextColorInput.startsWith('#') && (customTextColorInput.length === 4 || customTextColorInput.length === 7)) {
                        handleSetTextColor(customTextColorInput);
                        setCustomTextColorInput('');
                      }
                    }}
                    onBlur={() => {
                      if (customTextColorInput.startsWith('#') && (customTextColorInput.length === 4 || customTextColorInput.length === 7)) {
                        handleSetTextColor(customTextColorInput);
                      }
                      setCustomTextColorInput('');
                    }}
                    className="w-16 h-6 text-[10px] font-mono px-1 rounded-md border border-border bg-background"
                    title="Digitar código hex e pressionar Enter"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 2.4 Mais Formatação Tipográfica: Alinhamento, Itálico, Sublinhado, Riscado e Editar Texto */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={`size-7 rounded-md transition active:scale-[0.97] ${
                      isItalic || isUnderline || isStrikethrough
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {currentTextAlign === 'center' ? (
                      <AlignCenter className="size-3.5" />
                    ) : currentTextAlign === 'right' ? (
                      <AlignRight className="size-3.5" />
                    ) : (
                      <AlignLeft className="size-3.5" />
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Alinhamento e Estilos de Texto</TooltipContent>
            </Tooltip>

            <PopoverContent
              side="top"
              align="center"
              className="w-56 p-2.5 text-xs shadow-xl border-border bg-popover space-y-2.5"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              {/* Alinhamento */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Alinhamento
                </span>
                <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-md border border-border/50">
                  <button
                    type="button"
                    onClick={() => onUpdateElement(primaryElement.id, { textAlign: 'left' })}
                    className={`h-7 rounded flex items-center justify-center transition cursor-pointer ${
                      currentTextAlign === 'left' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    }`}
                    title="Alinhar à Esquerda"
                  >
                    <AlignLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement(primaryElement.id, { textAlign: 'center' })}
                    className={`h-7 rounded flex items-center justify-center transition cursor-pointer ${
                      currentTextAlign === 'center' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    }`}
                    title="Alinhar ao Centro"
                  >
                    <AlignCenter className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement(primaryElement.id, { textAlign: 'right' })}
                    className={`h-7 rounded flex items-center justify-center transition cursor-pointer ${
                      currentTextAlign === 'right' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    }`}
                    title="Alinhar à Direita"
                  >
                    <AlignRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Estilos Tipográficos */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Estilo
                </span>
                <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-md border border-border/50">
                  <button
                    type="button"
                    onClick={handleToggleItalic}
                    className={`h-7 rounded flex items-center justify-center transition cursor-pointer ${
                      isItalic ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    }`}
                    title="Itálico (Ctrl+I)"
                  >
                    <Italic className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleUnderline}
                    className={`h-7 rounded flex items-center justify-center transition cursor-pointer ${
                      isUnderline ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    }`}
                    title="Sublinhado (Ctrl+U)"
                  >
                    <Underline className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleStrikethrough}
                    className={`h-7 rounded flex items-center justify-center transition cursor-pointer ${
                      isStrikethrough ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background'
                    }`}
                    title="Tachado / Riscado"
                  >
                    <Strikethrough className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Botão de Atalho para Editar Texto */}
              {onStartEditing && (
                <div className="pt-1.5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => onStartEditing(primaryElement)}
                    className="w-full h-7 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition cursor-pointer"
                  >
                    <Edit3 className="size-3" />
                    <span>{primaryElement.text?.trim() ? 'Editar Conteúdo' : 'Escrever Texto'}</span>
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div className="w-px h-3.5 bg-border mx-0.5" />
        </div>
      )}

      {/* ========================================================= */}
      {/* SLOT 3: PARÂMETROS DA FERRAMENTA (Espessura de Borda/Traço) */}
      {/* ========================================================= */}
      {(isShape || isLineOrArrow) && (
        <div className="flex items-center gap-0.5">
          <Popover open={isStrokeWidthPopoverOpen} onOpenChange={setIsStrokeWidthPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-7 px-1.5 text-xs font-mono font-semibold flex items-center gap-1 text-foreground hover:bg-muted rounded-md transition cursor-pointer active:scale-[0.97]"
                    aria-label="Espessura"
                  >
                    <span className="tabular-nums">{currentStrokeWidth}px</span>
                    <ChevronDown className="size-2.5 opacity-60" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isShape ? `Espessura da borda (${currentStrokeWidth}px)` : `Espessura do traço (${currentStrokeWidth}px)`}
              </TooltipContent>
            </Tooltip>

            <PopoverContent
              side="top"
              align="center"
              className="w-48 p-2.5 text-xs shadow-xl border-border bg-popover"
              onPointerDownOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
              onInteractOutside={() => {
                if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
              }}
            >
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                <span className="font-semibold text-[11px] text-foreground">
                  {isShape ? 'Espessura da Borda' : 'Espessura do Traço'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{currentStrokeWidth}px</span>
              </div>

              {/* Campo Numérico Livre */}
              <div className="flex items-center gap-1 mb-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder={`${currentStrokeWidth}`}
                  value={customStrokeWidthInput}
                  onChange={(e) => setCustomStrokeWidthInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyCustomStrokeWidth();
                  }}
                  className="h-7 text-xs px-2 font-mono"
                />
                <Button
                  size="icon-sm"
                  onClick={handleApplyCustomStrokeWidth}
                  className="size-7 shrink-0 text-xs font-semibold"
                >
                  OK
                </Button>
              </div>

              {/* Grade de Espessuras Rápidas */}
              <div className="grid grid-cols-4 gap-1">
                {STROKE_WIDTH_PRESETS.map((w) => {
                  const isSelected = currentStrokeWidth === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleSelectStrokeWidth(w)}
                      className={`h-6 rounded text-[11px] font-mono transition flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {w}px
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-3.5 bg-border mx-0.5" />
        </div>
      )}

      {/* ========================================================= */}
      {/* SLOT 4: AÇÕES UNIVERSAIS (Link, Votação, Bloquear, Excluir, Mais) */}
      {/* ========================================================= */}
      <div className="flex items-center gap-0.5">
        {/* Link para qualquer elemento */}
        {renderLinkPopover()}

        {/* Controles de Votação (Sessão Ativa Estilo Miro) */}
        {isSessionActive && isElementEligible && primaryElement && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={(userElementVotes || 0) <= 0}
                  onClick={() => onRemoveVote?.(primaryElement.id)}
                  className="size-6 text-foreground hover:bg-card rounded"
                >
                  -
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Remover 1 voto deste item</TooltipContent>
            </Tooltip>

            <span className="text-[11px] font-mono font-bold px-1 text-amber-700 dark:text-amber-300">
              {userElementVotes || 0} {userElementVotes === 1 ? 'voto' : 'votos'}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={(userRemainingVotes || 0) <= 0}
                  onClick={() => onAddVote?.(primaryElement.id)}
                  className="size-6 text-foreground hover:bg-card rounded font-bold"
                >
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {(userRemainingVotes || 0) > 0
                  ? `Votar (+1) • ${userRemainingVotes} restantes`
                  : 'Seus votos acabaram'}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Bloqueio */}
        <LockButton
          isLocked={isLocked}
          onUnlock={() => onUpdateElement(primaryElement.id, { locked: false })}
          onLock={() => onUpdateElement(primaryElement.id, { locked: true })}
        />

        {/* Excluir Direto */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteElement(primaryElement.id)}
              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer active:scale-[0.97]"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Excluir (Del)</TooltipContent>
        </Tooltip>

        {/* Menu Mais Ações (...) */}
        <DropdownMenu modal={false}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground hover:text-foreground rounded-md cursor-pointer active:scale-[0.97]"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Mais ações</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            side="top"
            align="end"
            className="w-48 p-1 shadow-xl rounded-xl border-border bg-popover"
            onPointerDownOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
            onInteractOutside={() => {
              if (typeof window !== 'undefined') (window as any).__mirio_menu_dismissed_at = Date.now();
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {onReorderLayer && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center justify-between text-xs cursor-pointer py-1.5">
                  <span className="flex items-center gap-2">
                    <Layers className="size-3.5 text-muted-foreground" />
                    <span>Organizar camada</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem onClick={() => onReorderLayer('bringToFront')} className="gap-2 text-xs cursor-pointer">
                    <BringToFront className="size-3.5" />
                    Trazer para frente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderLayer('bringForward')} className="gap-2 text-xs cursor-pointer">
                    <ArrowUp className="size-3.5" />
                    Avançar uma camada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderLayer('sendBackward')} className="gap-2 text-xs cursor-pointer">
                    <ArrowDown className="size-3.5" />
                    Recuar uma camada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReorderLayer('sendToBack')} className="gap-2 text-xs cursor-pointer">
                    <SendToBack className="size-3.5" />
                    Enviar para trás
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            {(isSticky || isText || isFrame || isShape) && onStartEditing && (
              <DropdownMenuItem
                onClick={() => onStartEditing(primaryElement)}
                className="flex items-center justify-between text-xs cursor-pointer py-1.5"
              >
                <span className="flex items-center gap-2">
                  <Edit3 className="size-3.5 text-muted-foreground" />
                  <span>Editar Texto</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Duplo clique</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => onDuplicateElement(primaryElement)}
              className="flex items-center justify-between text-xs cursor-pointer py-1.5"
            >
              <span className="flex items-center gap-2">
                <CopyPlus className="size-3.5 text-muted-foreground" />
                <span>Duplicar</span>
              </span>
              <kbd className="text-[10px] text-muted-foreground font-mono">{modKey}+D</kbd>
            </DropdownMenuItem>

            {onCopyElements && (
              <DropdownMenuItem
                onClick={() => onCopyElements([primaryElement])}
                className="flex items-center justify-between text-xs cursor-pointer py-1.5"
              >
                <span className="flex items-center gap-2">
                  <Copy className="size-3.5 text-muted-foreground" />
                  <span>Copiar</span>
                </span>
                <kbd className="text-[10px] text-muted-foreground font-mono">{modKey}+C</kbd>
              </DropdownMenuItem>
            )}

            {onCutElements && (
              <DropdownMenuItem
                onClick={() => onCutElements([primaryElement])}
                className="flex items-center justify-between text-xs cursor-pointer py-1.5"
              >
                <span className="flex items-center gap-2">
                  <Scissors className="size-3.5 text-muted-foreground" />
                  <span>Recortar</span>
                </span>
                <kbd className="text-[10px] text-muted-foreground font-mono">{modKey}+X</kbd>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onDeleteElement(primaryElement.id)}
              className="flex items-center justify-between text-xs cursor-pointer py-1.5 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="size-3.5" />
                <span>Excluir</span>
              </span>
              <kbd className="text-[10px] text-destructive/80 font-mono">Del</kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

SelectionContextBar.displayName = 'SelectionContextBar';
