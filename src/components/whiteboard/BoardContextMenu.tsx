import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  StickyNote,
  Square,
  Circle,
  Diamond,
  Triangle,
  Star,
  Type,
  ArrowUpRight,
  Frame,
  ClipboardPaste,
  CheckSquare,
  Copy,
  CopyPlus,
  Scissors,
  Trash2,
  Lock,
  Unlock,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Layers,
  LayoutTemplate,
  Smile,
  Maximize2,
  Grid,
  ChevronRight,
  Edit3,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Plus,
  Magnet,
} from '@/components/ui/icons';
import type { CanvasElement } from '../../types/element';
import type { AlignmentType } from '../../utils/alignment';
import { STICKY_COLORS } from '../../utils/colors';

export interface BoardContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  targetElements: CanvasElement[];
  onClose: () => void;
  onCreateSticky: (color?: string) => void;
  onCreateShape: (shapeType: 'rect' | 'circle' | 'diamond' | 'triangle' | 'star') => void;
  onCreateText: () => void;
  onCreateArrow: () => void;
  onCreateFrame: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onReorderLayer: (action: 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward') => void;
  onAlign?: (type: AlignmentType) => void;
  onStartEditing?: (elementId: string) => void;
  onOpenTemplates?: () => void;
  onOpenStickers?: () => void;
  onResetZoom?: () => void;
  onToggleGrid?: () => void;
  showGrid?: boolean;
  onToggleSmartGuides?: () => void;
  smartGuidesEnabled?: boolean;
  readOnly?: boolean;
  canCommentOnly?: boolean;
}

type SubmenuType = 'sticky-colors' | 'shapes' | 'layers' | 'align' | 'insert' | null;

export const BoardContextMenu: React.FC<BoardContextMenuProps> = ({
  isOpen,
  position,
  targetElements,
  onClose,
  onCreateSticky,
  onCreateShape,
  onCreateText,
  onCreateArrow,
  onCreateFrame,
  onPaste,
  onSelectAll,
  onCopy,
  onCut,
  onDuplicate,
  onDelete,
  onToggleLock,
  onReorderLayer,
  onAlign,
  onStartEditing,
  onOpenTemplates,
  onOpenStickers,
  onResetZoom,
  onToggleGrid,
  showGrid = true,
  onToggleSmartGuides,
  smartGuidesEnabled = true,
  readOnly = false,
  canCommentOnly = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number; origin: string }>({
    x: position.x,
    y: position.y,
    origin: 'top left',
  });
  const [submenuSide, setSubmenuSide] = useState<'left' | 'right'>('right');

  // Ajusta a posição na tela para nunca transbordar as margens da viewport
  useLayoutEffect(() => {
    if (!isOpen) return;

    const menuEl = menuRef.current;
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const menuWidth = menuEl ? menuEl.offsetWidth || 230 : 230;
    const menuHeight = menuEl ? menuEl.offsetHeight || 340 : 340;

    let targetX = position.x;
    let targetY = position.y;
    let originX = 'left';
    let originY = 'top';

    // Se o menu estourar a borda direita
    if (position.x + menuWidth + padding > viewportWidth) {
      targetX = Math.max(padding, position.x - menuWidth);
      originX = 'right';
    } else {
      targetX = Math.max(padding, position.x);
    }

    // Se o menu estourar a borda inferior
    if (position.y + menuHeight + padding > viewportHeight) {
      targetY = Math.max(padding, position.y - menuHeight);
      originY = 'bottom';
    } else {
      targetY = Math.max(padding, position.y);
    }

    // Define de qual lado os submenus devem se abrir
    // Se o menu estiver na metade direita da tela, abre os submenus à esquerda
    if (targetX + menuWidth + 200 > viewportWidth) {
      setSubmenuSide('left');
    } else {
      setSubmenuSide('right');
    }

    setAdjustedPos({
      x: targetX,
      y: targetY,
      origin: `${originY} ${originX}`,
    });
  }, [isOpen, position.x, position.y]);

  // Fecha o menu com clique fora ou tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isElementMode = targetElements.length > 0;
  const isSingleElement = targetElements.length === 1;
  const primaryElement = isElementMode ? targetElements[0] : null;
  const allLocked = isElementMode && targetElements.every((e) => e.locked);
  const canEditPrimaryText =
    isSingleElement &&
    (primaryElement?.type === 'sticky' ||
      primaryElement?.type === 'text' ||
      primaryElement?.type === 'frame');

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu de contexto do quadro"
      className="fixed z-50 select-none min-w-[220px] max-w-[260px] rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150 will-change-transform"
      style={{
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
        transformOrigin: adjustedPos.origin,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* ========================================================= */}
      {/* MODO A: CLIQUE NO FUNDO DO CANVAS (MENU DE CRIAÇÃO RÁPIDA) */}
      {/* ========================================================= */}
      {!isElementMode ? (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
            Adicionar ao Board
          </div>

          {/* Nota Adesiva (Post-it) com hover flyout de cores */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('sticky-colors')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              onClick={() => {
                onCreateSticky();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <StickyNote className="size-4 text-amber-500 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Nota Adesiva</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                  N
                </kbd>
                <ChevronRight className="size-3.5 text-muted-foreground/60" />
              </div>
            </button>

            {/* Submenu de Cores de Post-it */}
            {activeSubmenu === 'sticky-colors' && (
              <div
                className="absolute top-0 z-50 min-w-[170px] rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 will-change-transform"
                style={{
                  [submenuSide === 'left' ? 'right' : 'left']: 'calc(100% + 4px)',
                }}
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                  Cores de Post-it
                </div>
                <div className="grid grid-cols-1 gap-0.5 mt-0.5">
                  {STICKY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        onCreateSticky(color.value);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <span
                        className="size-3.5 rounded-full border border-black/15 shadow-2xs shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="font-medium text-[11px] truncate">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Formas Geométricas com hover flyout */}
          {!canCommentOnly && (
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('shapes')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                onClick={() => {
                  onCreateShape('rect');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Square className="size-4 text-blue-500 group-hover:scale-105 transition-transform" />
                  <span className="font-medium">Formas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                    R
                  </kbd>
                  <ChevronRight className="size-3.5 text-muted-foreground/60" />
                </div>
              </button>

              {/* Submenu de Formas Geométricas */}
              {activeSubmenu === 'shapes' && (
                <div
                  className="absolute top-0 z-50 min-w-[160px] rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 will-change-transform"
                  style={{
                    [submenuSide === 'left' ? 'right' : 'left']: 'calc(100% + 4px)',
                  }}
                >
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                    Formas Geométricas
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateShape('rect');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Square className="size-3.5 text-blue-500" />
                        <span className="font-medium text-[11px]">Retângulo</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        R
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCreateShape('circle');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Circle className="size-3.5 text-indigo-500" />
                        <span className="font-medium text-[11px]">Círculo</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        O
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCreateShape('diamond');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Diamond className="size-3.5 text-cyan-500" />
                        <span className="font-medium text-[11px]">Losango / Decisão</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCreateShape('triangle');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Triangle className="size-3.5 text-emerald-500" />
                        <span className="font-medium text-[11px]">Triângulo</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCreateShape('star');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="size-3.5 text-amber-500" />
                        <span className="font-medium text-[11px]">Estrela</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Caixa de Texto */}
          {!canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onCreateText();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Type className="size-4 text-violet-500 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Texto</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                T
              </kbd>
            </button>
          )}

          {/* Seta / Conector */}
          {!canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onCreateArrow();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <ArrowUpRight className="size-4 text-teal-500 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Seta / Conector</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                A
              </kbd>
            </button>
          )}

          {/* Moldura de Sprint */}
          {!canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onCreateFrame();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Frame className="size-4 text-slate-500 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Moldura / Frame</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                F
              </kbd>
            </button>
          )}

          {/* Separador */}
          <div className="h-px bg-border/60 my-1" />

          {/* Ações da Área de Transferência */}
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
            Área de Transferência
          </div>

          {!readOnly && !canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onPaste();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <ClipboardPaste className="size-4 text-primary group-hover:scale-105 transition-transform" />
                <span className="font-medium">Colar aqui</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Ctrl+V
              </kbd>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectAll();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
              <span className="font-medium">Selecionar Tudo</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
              Ctrl+A
            </kbd>
          </button>

          {/* Separador */}
          <div className="h-px bg-border/60 my-1" />

          {/* Seção Explorar & Ferramentas */}
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
            Recursos
          </div>

          {onOpenTemplates && !readOnly && !canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onOpenTemplates();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <LayoutTemplate className="size-4 text-purple-500 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Modelos de Sprint...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                S
              </kbd>
            </button>
          )}

          {onOpenStickers && !readOnly && !canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onOpenStickers();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Smile className="size-4 text-amber-500 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Imagens, Stickers & Emojis...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                U
              </kbd>
            </button>
          )}

          {/* Zoom e Grade */}
          {onResetZoom && (
            <button
              type="button"
              onClick={() => {
                onResetZoom();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Maximize2 className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                <span className="font-medium">Redefinir Zoom</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Ctrl+0
              </kbd>
            </button>
          )}

          {onToggleGrid && (
            <button
              type="button"
              onClick={() => {
                onToggleGrid();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Grid className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                <span className="font-medium">{showGrid ? 'Ocultar Grade' : 'Exibir Grade'}</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Shift+G
              </kbd>
            </button>
          )}

          {onToggleSmartGuides && (
            <button
              type="button"
              onClick={() => {
                onToggleSmartGuides();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Magnet className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                <span className="font-medium">
                  {smartGuidesEnabled ? 'Desativar Guias Inteligentes' : 'Ativar Guias Inteligentes'}
                </span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                {smartGuidesEnabled ? 'Ativo' : 'Inativo'}
              </span>
            </button>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* MODO B: CLIQUE EM ELEMENTO OU GRUPO DE ELEMENTOS         */
        /* ========================================================= */
        <div className="space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75 flex items-center justify-between">
            <span>
              {targetElements.length === 1
                ? '1 Elemento Selecionado'
                : `${targetElements.length} Elementos Selecionados`}
            </span>
          </div>

          {/* Editar Texto (quando único elemento compatível) */}
          {canEditPrimaryText && onStartEditing && !readOnly && (
            <button
              type="button"
              onClick={() => {
                if (primaryElement) onStartEditing(primaryElement.id);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="size-4 text-primary group-hover:scale-105 transition-transform" />
                <span className="font-medium">Editar Conteúdo</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Enter
              </kbd>
            </button>
          )}

          {/* Copiar */}
          <button
            type="button"
            onClick={() => {
              onCopy();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Copy className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
              <span className="font-medium">Copiar</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
              Ctrl+C
            </kbd>
          </button>

          {/* Duplicar */}
          {!readOnly && !canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onDuplicate();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <CopyPlus className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                <span className="font-medium">Duplicar</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Ctrl+D
              </kbd>
            </button>
          )}

          {/* Recortar */}
          {!readOnly && !canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onCut();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Scissors className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                <span className="font-medium">Recortar</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Ctrl+X
              </kbd>
            </button>
          )}

          {/* Separador */}
          <div className="h-px bg-border/60 my-1" />

          {/* Bloquear / Desbloquear */}
          {!readOnly && !canCommentOnly && (
            <button
              type="button"
              onClick={() => {
                onToggleLock();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                {allLocked ? (
                  <Unlock className="size-4 text-emerald-500 group-hover:scale-105 transition-transform" />
                ) : (
                  <Lock className="size-4 text-amber-500 group-hover:scale-105 transition-transform" />
                )}
                <span className="font-medium">
                  {allLocked ? 'Desbloquear' : 'Bloquear no Quadro'}
                </span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                Ctrl+Shift+L
              </kbd>
            </button>
          )}

          {/* Submenu de Camadas */}
          {!readOnly && !canCommentOnly && (
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('layers')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                  <span className="font-medium">Organizar Camadas</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground/60" />
              </button>

              {activeSubmenu === 'layers' && (
                <div
                  className="absolute top-0 z-50 min-w-[170px] rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 will-change-transform"
                  style={{
                    [submenuSide === 'left' ? 'right' : 'left']: 'calc(100% + 4px)',
                  }}
                >
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                    Ordem de Camadas
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onReorderLayer('bringToFront');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <BringToFront className="size-3.5 text-blue-500" />
                        <span className="font-medium text-[11px]">Trazer para Frente</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Ctrl+]
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onReorderLayer('bringForward');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUp className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">Avançar uma Camada</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        ]
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onReorderLayer('sendBackward');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowDown className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">Recuar uma Camada</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        [
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onReorderLayer('sendToBack');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <SendToBack className="size-3.5 text-blue-500" />
                        <span className="font-medium text-[11px]">Enviar para Trás</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Ctrl+[
                      </kbd>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submenu de Alinhamento (quando 2+ elementos selecionados) */}
          {targetElements.length > 1 && onAlign && !readOnly && !canCommentOnly && (
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('align')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <AlignCenterHorizontal className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                  <span className="font-medium">Alinhamento</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground/60" />
              </button>

              {activeSubmenu === 'align' && (
                <div
                  className="absolute top-0 z-50 min-w-[170px] rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 will-change-transform"
                  style={{
                    [submenuSide === 'left' ? 'right' : 'left']: 'calc(100% + 4px)',
                  }}
                >
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                    Alinhar Itens
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onAlign('left');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlignStartVertical className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">À Esquerda</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Alt+A
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAlign('center-horizontal');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlignCenterVertical className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">Centro Horiz.</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Alt+H
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAlign('right');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlignEndVertical className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">À Direita</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Alt+D
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAlign('top');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlignStartHorizontal className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">Ao Topo</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Alt+W
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAlign('center-vertical');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlignCenterHorizontal className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">Centro Vert.</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Alt+V
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAlign('bottom');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <AlignEndHorizontal className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-[11px]">À Base</span>
                      </div>
                      <kbd className="px-1 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground rounded border border-border/50">
                        Alt+S
                      </kbd>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submenu Inserir aqui */}
          {!readOnly && (
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('insert')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Plus className="size-4 text-muted-foreground group-hover:scale-105 transition-transform" />
                  <span className="font-medium">Inserir aqui</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground/60" />
              </button>

              {activeSubmenu === 'insert' && (
                <div
                  className="absolute top-0 z-50 min-w-[160px] rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 will-change-transform"
                  style={{
                    [submenuSide === 'left' ? 'right' : 'left']: 'calc(100% + 4px)',
                  }}
                >
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                    Criar no Ponto
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateSticky();
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                    >
                      <StickyNote className="size-3.5 text-amber-500" />
                      <span className="font-medium text-[11px]">Nota Adesiva</span>
                    </button>

                    {!canCommentOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreateShape('rect');
                          onClose();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                      >
                        <Square className="size-3.5 text-blue-500" />
                        <span className="font-medium text-[11px]">Retângulo</span>
                      </button>
                    )}

                    {!canCommentOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreateShape('circle');
                          onClose();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                      >
                        <Circle className="size-3.5 text-indigo-500" />
                        <span className="font-medium text-[11px]">Círculo</span>
                      </button>
                    )}

                    {!canCommentOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreateText();
                          onClose();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-[0.98] cursor-pointer text-left"
                      >
                        <Type className="size-3.5 text-violet-500" />
                        <span className="font-medium text-[11px]">Texto</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Separador */}
          <div className="h-px bg-border/60 my-1" />

          {/* Excluir (Destrutivo) */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-all duration-100 active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 group-hover:scale-105 transition-transform" />
                <span className="font-medium">Excluir</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-destructive/10 text-destructive rounded border border-destructive/20">
                Del
              </kbd>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
