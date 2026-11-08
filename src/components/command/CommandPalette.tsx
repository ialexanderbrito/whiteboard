import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MousePointer,
  Hand,
  StickyNote,
  Square,
  Circle,
  ArrowUpRight,
  Pen,
  Type,
  Frame,
  Eraser,
  MessageSquare,
  Smile,
  Timer,
  Vote,
  Tv,
  LayoutTemplate,
  Download,
  Share2,
  RotateCcw,
  Sun,
  Moon,
  Keyboard,
  LayoutGrid,
  Plus,
  Grid,
  List,
  Coffee,
  LogOut,
  FolderKanban,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  UserPen,
  CircleDot,
  Boxes,
  Eye,
  EyeOff,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import type { ToolType, CanvasElement } from '@/types/element';
import type { AlignmentType } from '@/utils/alignment';
import type { Board } from '@/types/board';
import type { GridType, GridSize } from '@/components/whiteboard/CanvasGrid';

export interface CommandPaletteBoardContext {
  boardTitle?: string;
  isAnonymous?: boolean;
  frames?: CanvasElement[];
  currentTool?: ToolType;
  selectedCount?: number;
  onAlignElements?: (type: AlignmentType) => void;
  onOpenEditProfile?: () => void;
  onSelectTool?: (tool: ToolType) => void;
  onJumpToFrame?: (frame: CanvasElement) => void;
  onStartTimer?: (seconds: number) => void;
  onOpenVoting?: () => void;
  onEnterPresentation?: () => void;
  onOpenTemplates?: () => void;
  onOpenStickers?: () => void;
  onOpenShortcuts?: () => void;
  onExportPNG?: () => void;
  onExportJSON?: () => void;
  onShare?: () => void;
  onResetZoom?: () => void;
  onOpenCursorChat?: () => void;
  onBackToDashboard?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  showGrid?: boolean;
  onToggleGrid?: (show?: boolean) => void;
  gridType?: GridType;
  onChangeGridType?: (type: GridType) => void;
  gridSize?: GridSize;
  onChangeGridSize?: (size: GridSize) => void;
  gridOpacity?: number;
  onChangeGridOpacity?: (opacity: number) => void;
}

export interface CommandPaletteDashboardContext {
  boards?: Board[];
  isAnonymous?: boolean;
  onCreateBoard?: () => void;
  onOpenEditProfile?: () => void;
  onToggleViewMode?: () => void;
  viewMode?: 'grid' | 'table';
  onOpenCoffee?: () => void;
  onOpenShortcuts?: () => void;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  onLogout?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardContext?: CommandPaletteBoardContext;
  dashboardContext?: CommandPaletteDashboardContext;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  boardContext,
  dashboardContext,
}) => {
  const navigate = useNavigate();
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const formatKey = (key: string) => {
    if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Shift') return isMac ? '⇧' : 'Shift';
    if (key === 'Alt') return isMac ? '⌥' : 'Alt';
    return key;
  };

  // Atalho global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) {
          return;
        }
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (callback?: () => void) => {
    onOpenChange(false);
    if (callback) {
      // Executa a ação imediatamente
      callback();
    }
  };

  const isBoard = Boolean(boardContext);
  const isDashboard = Boolean(dashboardContext);

  // Frames sanitizados com rótulo amigável
  const frameItems = useMemo(() => {
    if (!boardContext?.frames) return [];
    return boardContext.frames.map((frame, index) => {
      const title = (frame.text || '').trim() || `Moldura #${index + 1}`;
      return {
        id: frame.id,
        title,
        frame,
      };
    });
  }, [boardContext?.frames]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Header Contextual com Badge Elegante */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80">
            {isBoard
              ? `Quadro • ${boardContext?.boardTitle || 'Quadro sem título'}`
              : 'Mirio Workspace • Dashboard'}
          </span>
        </div>
        <span className="text-[10px] font-mono font-medium text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </span>
      </div>

      <CommandInput
        placeholder={
          isBoard
            ? "Buscar ferramentas, frames, timer, votação ou ações..."
            : "Buscar quadros ou ações rápidas..."
        }
      />

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
            <Sparkles className="size-5 text-muted-foreground/50 mb-1" />
            <p className="text-xs font-semibold text-foreground">Nenhum resultado encontrado</p>
            <p className="text-[11px] text-muted-foreground">
              Tente buscar por termos como post-it, timer, retas, frames ou nome do quadro.
            </p>
          </div>
        </CommandEmpty>

        {/* ============================================================== */}
        {/* CONTEXTO: QUADRO BRANCO (BOARD PAGE)                          */}
        {/* ============================================================== */}
        {isBoard && boardContext && (
          <>
            {/* Navegação Rápida entre Frames (Jump to Frame / Slides) */}
            {frameItems.length > 0 && (
              <CommandGroup heading="Saltar para Moldura (Frames)">
                {frameItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(() => boardContext.onJumpToFrame?.(item.frame))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 group-data-[selected=true]:bg-indigo-500 group-data-[selected=true]:text-white transition-colors">
                      <Frame className="size-3.5" />
                    </div>
                    <span className="font-medium text-foreground">{item.title}</span>
                    <CommandShortcut>
                      <span className="text-[10px] text-muted-foreground/80 font-mono">Pular</span>
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Alinhamento dos Elementos Selecionados */}
            {Boolean(boardContext.selectedCount && boardContext.selectedCount >= 2 && boardContext.onAlignElements) && (
              <CommandGroup heading={`Alinhamento (${boardContext.selectedCount} selecionados)`}>
                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onAlignElements?.('left'))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                    <AlignStartVertical className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Alinhar à Esquerda</span>
                  <CommandShortcut>{formatKey('Alt')}+A</CommandShortcut>
                </CommandItem>

                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onAlignElements?.('center-horizontal'))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                    <AlignCenterVertical className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Centralizar Horizontalmente</span>
                  <CommandShortcut>{formatKey('Alt')}+H</CommandShortcut>
                </CommandItem>

                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onAlignElements?.('right'))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                    <AlignEndVertical className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Alinhar à Direita</span>
                  <CommandShortcut>{formatKey('Alt')}+D</CommandShortcut>
                </CommandItem>

                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onAlignElements?.('top'))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                    <AlignStartHorizontal className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Alinhar ao Topo</span>
                  <CommandShortcut>{formatKey('Alt')}+W</CommandShortcut>
                </CommandItem>

                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onAlignElements?.('center-vertical'))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                    <AlignCenterHorizontal className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Centralizar Verticalmente</span>
                  <CommandShortcut>{formatKey('Alt')}+V</CommandShortcut>
                </CommandItem>

                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onAlignElements?.('bottom'))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                    <AlignEndHorizontal className="size-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Alinhar à Base</span>
                  <CommandShortcut>{formatKey('Alt')}+S</CommandShortcut>
                </CommandItem>

                {boardContext.selectedCount && boardContext.selectedCount >= 3 && (
                  <>
                    <CommandItem
                      onSelect={() => handleSelect(() => boardContext.onAlignElements?.('distribute-horizontal'))}
                      className="group"
                    >
                      <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 group-data-[selected=true]:bg-indigo-500 group-data-[selected=true]:text-white transition-colors">
                        <AlignHorizontalDistributeCenter className="size-3.5" />
                      </div>
                      <span className="font-medium text-foreground">Distribuir Horizontalmente</span>
                      <CommandShortcut>{formatKey('Ctrl')}+{formatKey('Alt')}+H</CommandShortcut>
                    </CommandItem>

                    <CommandItem
                      onSelect={() => handleSelect(() => boardContext.onAlignElements?.('distribute-vertical'))}
                      className="group"
                    >
                      <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 group-data-[selected=true]:bg-indigo-500 group-data-[selected=true]:text-white transition-colors">
                        <AlignVerticalDistributeCenter className="size-3.5" />
                      </div>
                      <span className="font-medium text-foreground">Distribuir Verticalmente</span>
                      <CommandShortcut>{formatKey('Ctrl')}+{formatKey('Alt')}+V</CommandShortcut>
                    </CommandItem>
                  </>
                )}
              </CommandGroup>
            )}

            {/* Ferramentas de Criação & Desenho */}
            <CommandGroup heading="Ferramentas do Canvas">
              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('select'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <MousePointer className="size-3.5" />
                </div>
                <span>Mover e Selecionar</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">V</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('pan'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <Hand className="size-3.5" />
                </div>
                <span>Mão / Panorâmica (Pan)</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">H</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('sticky'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-data-[selected=true]:bg-amber-500 group-data-[selected=true]:text-white transition-colors">
                  <StickyNote className="size-3.5" />
                </div>
                <span>Post-it (Sticky Note)</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">N</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('rect'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <Square className="size-3.5" />
                </div>
                <span>Retângulo</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">R</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('circle'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <Circle className="size-3.5" />
                </div>
                <span>Círculo</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">O</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('arrow'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <ArrowUpRight className="size-3.5" />
                </div>
                <span>Seta Conectora</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">A</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('pen'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <Pen className="size-3.5" />
                </div>
                <span>Caneta / Desenho Livre</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">P</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('text'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                  <Type className="size-3.5" />
                </div>
                <span>Caixa de Texto</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">T</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('frame'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 group-data-[selected=true]:bg-indigo-500 group-data-[selected=true]:text-white transition-colors">
                  <Frame className="size-3.5" />
                </div>
                <span>Nova Moldura / Raia</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">F</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onSelectTool?.('eraser'))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 group-data-[selected=true]:bg-rose-500 group-data-[selected=true]:text-white transition-colors">
                  <Eraser className="size-3.5" />
                </div>
                <span>Borracha (Eraser)</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">E</kbd>
                </CommandShortcut>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onOpenStickers)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-data-[selected=true]:bg-amber-500 group-data-[selected=true]:text-white transition-colors">
                  <Smile className="size-3.5" />
                </div>
                <span>Stickers, Emojis & GIFs</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onOpenCursorChat)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 group-data-[selected=true]:bg-cyan-500 group-data-[selected=true]:text-white transition-colors">
                  <MessageSquare className="size-3.5" />
                </div>
                <span>Chat do Cursor ao Vivo</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">/</kbd>
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>

            {/* Facilitação & Sprints de Equipe */}
            <CommandGroup heading="Facilitação & Sprints">
              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onStartTimer?.(300))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 group-data-[selected=true]:bg-purple-500 group-data-[selected=true]:text-white transition-colors">
                  <Timer className="size-3.5" />
                </div>
                <span>Iniciar Timer de 5 Minutos</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onStartTimer?.(900))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 group-data-[selected=true]:bg-purple-500 group-data-[selected=true]:text-white transition-colors">
                  <Timer className="size-3.5" />
                </div>
                <span>Iniciar Timer de 15 Minutos</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(() => boardContext.onStartTimer?.(1500))}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 group-data-[selected=true]:bg-purple-500 group-data-[selected=true]:text-white transition-colors">
                  <Timer className="size-3.5" />
                </div>
                <span>Iniciar Timer Pomodoro (25 Minutos)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onOpenVoting)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-data-[selected=true]:bg-emerald-500 group-data-[selected=true]:text-white transition-colors">
                  <Vote className="size-3.5" />
                </div>
                <span>Sessão de Votação (Dot Voting)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onEnterPresentation)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 group-data-[selected=true]:bg-indigo-500 group-data-[selected=true]:text-white transition-colors">
                  <Tv className="size-3.5" />
                </div>
                <span>Iniciar Modo Apresentação de Slides</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onOpenTemplates)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 group-data-[selected=true]:bg-purple-500 group-data-[selected=true]:text-white transition-colors">
                  <LayoutTemplate className="size-3.5" />
                </div>
                <span>Inserir Templates de Sprint (Scrum, Retro, Kanban)</span>
              </CommandItem>
            </CommandGroup>

            {/* Ações do Quadro & Navegação */}
            <CommandGroup heading="Ações do Quadro">
              <CommandItem
                onSelect={() => handleSelect(boardContext.onExportPNG)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 group-data-[selected=true]:bg-teal-500 group-data-[selected=true]:text-white transition-colors">
                  <Download className="size-3.5" />
                </div>
                <span>Exportar Quadro como Imagem (PNG)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onExportJSON)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 group-data-[selected=true]:bg-teal-500 group-data-[selected=true]:text-white transition-colors">
                  <FileText className="size-3.5" />
                </div>
                <span>Exportar Backup do Quadro (JSON)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onShare)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-data-[selected=true]:bg-sky-500 group-data-[selected=true]:text-white transition-colors">
                  <Share2 className="size-3.5" />
                </div>
                <span>Compartilhar Quadro & Permissões</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(boardContext.onResetZoom)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                  <RotateCcw className="size-3.5" />
                </div>
                <span>Redefinir Zoom para 100%</span>
                <CommandShortcut>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">
                    {formatKey('Ctrl')}+0
                  </kbd>
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>

            {/* Visualização & Grade do Canvas */}
            <CommandGroup heading="Grade do Canvas">
              {boardContext.onToggleGrid && (
                <CommandItem
                  onSelect={() => handleSelect(() => boardContext.onToggleGrid?.(!boardContext.showGrid))}
                  className="group"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                    {boardContext.showGrid ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </div>
                  <span>{boardContext.showGrid ? 'Ocultar Grade do Canvas' : 'Exibir Grade do Canvas'}</span>
                  <CommandShortcut>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">
                      {formatKey('Ctrl')}+'
                    </kbd>
                  </CommandShortcut>
                </CommandItem>
              )}

              {boardContext.onChangeGridType && (
                <>
                  <CommandItem
                    onSelect={() => handleSelect(() => {
                      if (!boardContext.showGrid && boardContext.onToggleGrid) {
                        boardContext.onToggleGrid(true);
                      }
                      boardContext.onChangeGridType?.('hybrid');
                    })}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <LayoutGrid className="size-3.5" />
                    </div>
                    <span>Estilo de Grade: Híbrida (Pontos + Linhas)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => {
                      if (!boardContext.showGrid && boardContext.onToggleGrid) {
                        boardContext.onToggleGrid(true);
                      }
                      boardContext.onChangeGridType?.('dots');
                    })}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <CircleDot className="size-3.5" />
                    </div>
                    <span>Estilo de Grade: Pontos</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => {
                      if (!boardContext.showGrid && boardContext.onToggleGrid) {
                        boardContext.onToggleGrid(true);
                      }
                      boardContext.onChangeGridType?.('lines');
                    })}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <Grid className="size-3.5" />
                    </div>
                    <span>Estilo de Grade: Linhas (Papel Milimetrado)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => {
                      if (!boardContext.showGrid && boardContext.onToggleGrid) {
                        boardContext.onToggleGrid(true);
                      }
                      boardContext.onChangeGridType?.('crosses');
                    })}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <Plus className="size-3.5" />
                    </div>
                    <span>Estilo de Grade: Cruzes / Retículo (+)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => {
                      if (!boardContext.showGrid && boardContext.onToggleGrid) {
                        boardContext.onToggleGrid(true);
                      }
                      boardContext.onChangeGridType?.('isometric');
                    })}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <Boxes className="size-3.5" />
                    </div>
                    <span>Estilo de Grade: Isométrica 3D</span>
                  </CommandItem>
                </>
              )}

              {boardContext.onChangeGridSize && (
                <>
                  <CommandItem
                    onSelect={() => handleSelect(() => boardContext.onChangeGridSize?.('small'))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <span className="text-[10px] font-bold">24</span>
                    </div>
                    <span>Densidade da Grade: Pequena (24px)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => boardContext.onChangeGridSize?.('medium'))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <span className="text-[10px] font-bold">40</span>
                    </div>
                    <span>Densidade da Grade: Média (40px)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => boardContext.onChangeGridSize?.('large'))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <span className="text-[10px] font-bold">64</span>
                    </div>
                    <span>Densidade da Grade: Grande (64px)</span>
                  </CommandItem>
                </>
              )}

              {boardContext.onChangeGridOpacity && (
                <>
                  <CommandItem
                    onSelect={() => handleSelect(() => boardContext.onChangeGridOpacity?.(0.3))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <SlidersHorizontal className="size-3.5" />
                    </div>
                    <span>Opacidade da Grade: Suave (30%)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => boardContext.onChangeGridOpacity?.(0.55))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <SlidersHorizontal className="size-3.5" />
                    </div>
                    <span>Opacidade da Grade: Padrão (55%)</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={() => handleSelect(() => boardContext.onChangeGridOpacity?.(0.9))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <SlidersHorizontal className="size-3.5" />
                    </div>
                    <span>Opacidade da Grade: Nítida (90%)</span>
                  </CommandItem>
                </>
              )}
            </CommandGroup>
          </>
        )}

        {/* ============================================================== */}
        {/* CONTEXTO: DASHBOARD PAGE                                       */}
        {/* ============================================================== */}
        {isDashboard && dashboardContext && (
          <>
            {/* Fuzzy Search de Quadros */}
            {dashboardContext.boards && dashboardContext.boards.length > 0 && (
              <CommandGroup heading="Seus Quadros Recentes">
                {dashboardContext.boards.map((b) => (
                  <CommandItem
                    key={b.id}
                    onSelect={() => handleSelect(() => navigate(`/b/${b.id}`))}
                    className="group"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                      <FolderKanban className="size-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{b.title || 'Quadro sem título'}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {new Date(b.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <CommandShortcut>
                      <ExternalLink className="size-3 text-muted-foreground/60" />
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Ações do Painel">
              <CommandItem
                onSelect={() => handleSelect(dashboardContext.onCreateBoard)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-data-[selected=true]:bg-emerald-500 group-data-[selected=true]:text-white transition-colors">
                  <Plus className="size-3.5" />
                </div>
                <span>Criar Novo Quadro em Branco</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(dashboardContext.onToggleViewMode)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                  {dashboardContext.viewMode === 'grid' ? (
                    <List className="size-3.5" />
                  ) : (
                    <Grid className="size-3.5" />
                  )}
                </div>
                <span>
                  Alternar para Visualização em {dashboardContext.viewMode === 'grid' ? 'Lista' : 'Grade'}
                </span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect(dashboardContext.onOpenCoffee)}
                className="group"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 group-data-[selected=true]:bg-amber-500 group-data-[selected=true]:text-white transition-colors">
                  <Coffee className="size-3.5" />
                </div>
                <span>Apoiar o Projeto Mirio (PIX)</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* ============================================================== */}
        {/* SEÇÃO GLOBAL: SISTEMA, TEMA & AJUDA                           */}
        {/* ============================================================== */}
        <CommandSeparator />
        <CommandGroup heading="Sistema & Preferências">
          {(boardContext?.onOpenEditProfile || dashboardContext?.onOpenEditProfile) && (
            <CommandItem
              onSelect={() =>
                handleSelect(boardContext?.onOpenEditProfile || dashboardContext?.onOpenEditProfile)
              }
              className="group"
            >
              {(boardContext?.isAnonymous ?? dashboardContext?.isAnonymous ?? true) ? (
                <>
                  <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-data-[selected=true]:bg-emerald-500 group-data-[selected=true]:text-white transition-colors">
                    <UserPen className="size-3.5" />
                  </div>
                  <span>Trocar Nome de Convidado</span>
                </>
              ) : (
                <>
                  <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:text-white transition-colors">
                    <Palette className="size-3.5" />
                  </div>
                  <span>Personalizar Cor do Cursor (Conta Google)</span>
                </>
              )}
            </CommandItem>
          )}

          {(boardContext?.onToggleTheme || dashboardContext?.onToggleTheme) && (
            <CommandItem
              onSelect={() =>
                handleSelect(boardContext?.onToggleTheme || dashboardContext?.onToggleTheme)
              }
              className="group"
            >
              <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                {boardContext?.isDarkMode ?? dashboardContext?.isDarkMode ? (
                  <Sun className="size-3.5" />
                ) : (
                  <Moon className="size-3.5" />
                )}
              </div>
              <span>
                Mudar para Tema{' '}
                {boardContext?.isDarkMode ?? dashboardContext?.isDarkMode ? 'Claro' : 'Escuro'}
              </span>
            </CommandItem>
          )}

          {(boardContext?.onOpenShortcuts || dashboardContext?.onOpenShortcuts) && (
            <CommandItem
              onSelect={() =>
                handleSelect(boardContext?.onOpenShortcuts || dashboardContext?.onOpenShortcuts)
              }
              className="group"
            >
              <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                <Keyboard className="size-3.5" />
              </div>
              <span>Ver Todos os Atalhos de Teclado</span>
              <CommandShortcut>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">?</kbd>
              </CommandShortcut>
            </CommandItem>
          )}

          {isBoard && boardContext?.onBackToDashboard && (
            <CommandItem
              onSelect={() => handleSelect(boardContext.onBackToDashboard)}
              className="group"
            >
              <div className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground transition-colors">
                <LayoutGrid className="size-3.5" />
              </div>
              <span>Voltar ao Painel de Quadros</span>
            </CommandItem>
          )}

          {(boardContext?.onLogout || dashboardContext?.onLogout) && (
            <CommandItem
              onSelect={() => handleSelect(boardContext?.onLogout || dashboardContext?.onLogout)}
              className="group text-rose-500 data-[selected=true]:text-rose-500"
            >
              <div className="flex size-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 group-data-[selected=true]:bg-rose-500 group-data-[selected=true]:text-white transition-colors">
                <LogOut className="size-3.5" />
              </div>
              <span>Sair da Conta (Logout)</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>

      {/* Rodapé Informativo Estilo Raycast */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/20 text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">↑↓</kbd>
            <span>Navegar</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">↵</kbd>
            <span>Executar</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">Esc</kbd>
            <span>Fechar</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/60">
          <span>Mirio Spotlight</span>
        </div>
      </div>
    </CommandDialog>
  );
};
