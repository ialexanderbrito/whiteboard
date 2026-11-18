import React, { useEffect, useRef, useState } from 'react';
import { 
  MousePointer, 
  StickyNote, 
  CheckSquare,
  Square, 
  Circle, 
  Diamond,
  Triangle,
  Star,
  ArrowUpRight, 
  Pen, 
  Highlighter,
  Eraser,
  Type, 
  Hand,
  Trash2,
  ZoomIn,
  ZoomOut,
  BoxSelect,
  Smile,
  Undo2,
  Redo2,
  Pipette,
  Wand2,
  Scissors,
  Layers,
  MessageSquare,
  HelpCircle,
  Laser,
  Minus,
  Plus,
  LayoutTemplate,
  Hexagon,
  Cylinder,
  Table2,
  FolderKanban,
  GitBranch,
  Code2,
  MessagePin,
  Map
} from '@/components/ui/icons';
import type { ToolType } from '../../types/element';
import { STICKY_COLORS, SHAPE_QUICK_SWATCHES } from '../../utils/colors';
import { DEFAULT_LASER_COLOR, LASER_COLOR_OPTIONS } from '../../utils/laserGeometry.ts';
import { subscribeCursorReadout } from '../../utils/cursorReadout';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  laserColor?: string;
  onSelectLaserColor?: (color: string) => void;
  hasSelection: boolean;
  selectionCount?: number;
  onDeleteSelected: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenStickersModal: () => void;
  // Desfazer e Refazer
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // Poderes da Caneta (Miro)
  penMode: 'pen' | 'highlighter' | 'eraser';
  onSelectPenMode: (mode: 'pen' | 'highlighter' | 'eraser') => void;
  penStrokeWidth: number;
  onSelectPenStrokeWidth: (width: number) => void;
  smartDrawing?: boolean;
  onToggleSmartDrawing?: () => void;
  // Modos da Borracha (Objeto vs Parcial)
  eraserMode?: 'whole' | 'partial';
  onSelectEraserMode?: (mode: 'whole' | 'partial') => void;
  eraserSize?: number;
  onSelectEraserSize?: (size: number) => void;
  // Chat do Cursor
  isCursorChatOpen?: boolean;
  onToggleCursorChat?: () => void;
  // Modo apenas visualização
  readOnly?: boolean;
  // Modo apenas comentários (permite post-its e chat)
  canCommentOnly?: boolean;
  // Posicionamento da barra (lateral esquerda ou centro inferior)
  position?: 'left' | 'bottom';
  // Central de Ajuda & Atalhos
  onOpenShortcuts?: () => void;
  // Minimapa Interativo Retrátil
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
  // Templates de Sprint (Padrão Miro / FigJam)
  onOpenTemplates?: () => void;
}

const PEN_COLORS = [
  { name: 'Preto', value: '#0f172a' },
  { name: 'Cinza Ardósia', value: '#64748b' },
  { name: 'Azul Caneta', value: '#2563eb' },
  { name: 'Azul Celeste', value: '#0284c7' },
  { name: 'Verde Esmeralda', value: '#10b981' },
  { name: 'Verde Menta', value: '#14b8a6' },
  { name: 'Laranja', value: '#f59e0b' },
  { name: 'Amarelo Marca-texto', value: '#eab308' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Coral', value: '#f43f5e' },
  { name: 'Roxo Criativo', value: '#8b5cf6' },
  { name: 'Rosa Vibrante', value: '#ec4899' },
  { name: 'Branco', value: '#ffffff' },
];

const PEN_WIDTHS = [
  { label: 'Fina', value: 2 },
  { label: 'Média', value: 4 },
  { label: 'Grossa', value: 8 },
  { label: 'Marcador', value: 16 },
];

const SHAPE_OPTIONS = [
  { id: 'rect' as ToolType, label: 'Retângulo', icon: Square, shortcut: 'R' },
  { id: 'circle' as ToolType, label: 'Círculo', icon: Circle, shortcut: 'O' },
  { id: 'diamond' as ToolType, label: 'Losango', icon: Diamond },
  { id: 'triangle' as ToolType, label: 'Triângulo', icon: Triangle },
  { id: 'star' as ToolType, label: 'Estrela', icon: Star },
  { id: 'hexagon' as ToolType, label: 'Hexágono', icon: Hexagon },
  { id: 'cylinder' as ToolType, label: 'Cilindro / DB', icon: Cylinder },
];

const CONNECTOR_OPTIONS = [
  { id: 'arrow' as ToolType, label: 'Seta Conectora', icon: ArrowUpRight, shortcut: 'A' },
  { id: 'line' as ToolType, label: 'Linha Reta', icon: Minus },
];

const WIDGET_OPTIONS = [
  { id: 'table' as ToolType, label: 'Tabela Editável', icon: Table2 },
  { id: 'kanban' as ToolType, label: 'Quadro Kanban', icon: FolderKanban },
  { id: 'mindmap' as ToolType, label: 'Mapa Mental', icon: GitBranch },
  { id: 'code' as ToolType, label: 'Bloco de Código', icon: Code2 },
];

/**
 * Reads the live cursor position straight from the DOM channel so mouse
 * movement never re-renders the board or this toolbar.
 */
const CursorCoordinates: React.FC = () => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return subscribeCursorReadout(({ x, y }) => {
      const node = ref.current;
      if (node) node.textContent = `${x}, ${y}`;
    });
  }, []);

  return <span ref={ref}>0, 0</span>;
};

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  currentTool,
  onSelectTool,
  selectedColor,
  onSelectColor,
  laserColor = DEFAULT_LASER_COLOR,
  onSelectLaserColor,
  hasSelection,
  selectionCount = 0,
  onDeleteSelected,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenStickersModal,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  penMode,
  onSelectPenMode,
  penStrokeWidth,
  onSelectPenStrokeWidth,
  smartDrawing = false,
  onToggleSmartDrawing,
  eraserMode = 'whole',
  onSelectEraserMode,
  eraserSize = 20,
  onSelectEraserSize,
  isCursorChatOpen = false,
  onToggleCursorChat,
  readOnly = false,
  canCommentOnly = false,
  position = 'left',
  onOpenShortcuts,
  showMinimap = false,
  onToggleMinimap,
  onOpenTemplates,
}) => {
  const [activePicker, setActivePicker] = useState<'laser' | 'sticky' | 'checklist' | 'pen' | 'shapes' | 'connectors' | 'widgets' | null>(null);
  const [currentShape, setCurrentShape] = useState<ToolType>('rect');
  const [currentConnector, setCurrentConnector] = useState<ToolType>('arrow');
  const [currentWidget, setCurrentWidget] = useState<ToolType>('table');
  const toolbarContainerRef = useRef<HTMLDivElement>(null);

  // Fecha popovers abertos ao clicar fora da barra ou pressionar ESC
  useEffect(() => {
    if (!activePicker) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (toolbarContainerRef.current && !toolbarContainerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePicker(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePicker]);

  const isBottom = position === 'bottom';
  const tooltipSide = isBottom ? 'top' : 'right';

  const isShapeActive = SHAPE_OPTIONS.some((s) => s.id === currentTool);
  const isConnectorActive = CONNECTOR_OPTIONS.some((c) => c.id === currentTool);
  const isWidgetActive = WIDGET_OPTIONS.some((w) => w.id === currentTool);
  const isDrawingActive = ['pen', 'highlighter', 'eraser'].includes(currentTool);

  const activeShapeOption = SHAPE_OPTIONS.find((s) => s.id === currentShape) || SHAPE_OPTIONS[0];
  const ActiveShapeIcon = activeShapeOption.icon;

  const activeConnectorOption = CONNECTOR_OPTIONS.find((c) => c.id === currentConnector) || CONNECTOR_OPTIONS[0];
  const ActiveConnectorIcon = activeConnectorOption.icon;

  const activeWidgetOption = WIDGET_OPTIONS.find((w) => w.id === currentWidget) || WIDGET_OPTIONS[0];
  const ActiveWidgetIcon = activeWidgetOption.icon;

  return (
    <>
      {/* 1. Barra de Ferramentas Flutuante Principal */}
      <div
        ref={toolbarContainerRef}
        className={`z-30 flex items-center bg-background/85 dark:bg-card/85 backdrop-blur-md rounded-xl shadow-md border border-border p-1 gap-1 ${
          isBottom
            ? 'fixed bottom-4 left-1/2 -translate-x-1/2 flex-row'
            : 'absolute left-4 top-1/2 -translate-y-1/2 flex-col'
        }`}
      >
        {/* Ferramentas Básicas (Seleção no topo/início como padrão de design suites) */}
        <div className={`flex ${isBottom ? 'flex-row' : 'flex-col'} gap-0.5`}>
          {/* Seleção */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('select');
                  setActivePicker(null);
                }}
                className={`size-8 rounded-md transition-colors flex items-center justify-center active:scale-[0.98] ${
                  currentTool === 'select'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <MousePointer className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="font-medium text-xs">Selecionar <span className="opacity-60 text-[10px]">(V)</span></p>
            </TooltipContent>
          </Tooltip>

          {/* Mover / Pan */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('pan');
                  setActivePicker(null);
                }}
                className={`size-8 rounded-md transition-colors flex items-center justify-center active:scale-[0.98] ${
                  currentTool === 'pan'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Hand className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="font-medium text-xs">Mover <span className="opacity-60 text-[10px]">(H ou Espaço)</span></p>
            </TooltipContent>
          </Tooltip>

          {/* Apontador Laser (L) com Seletor de Cor - Acessível para todos, inclusive em modo de visualização */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool('laser');
                    setActivePicker(activePicker === 'laser' ? null : 'laser');
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    currentTool === 'laser'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Laser className="size-4" />
                  <span
                    className="absolute bottom-1 right-1 size-1.5 rounded-full border border-background"
                    style={{ backgroundColor: laserColor }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">Apontador Laser <span className="opacity-60 text-[10px]">(L)</span></p>
              </TooltipContent>
            </Tooltip>

            {/* Paleta flutuante de Cores do Laser */}
            {activePicker === 'laser' && currentTool === 'laser' && (
              <div
                className={`absolute ${
                  isBottom
                    ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2 origin-bottom'
                    : 'left-full ml-2 top-0 origin-left'
                } bg-popover text-popover-foreground p-3 rounded-lg shadow-md border border-border flex flex-col gap-2 z-40 animate-in fade-in-0 zoom-in-95 duration-150 w-44`}
              >
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
                        onSelectLaserColor?.(c.value);
                        onSelectTool('laser');
                        setActivePicker(null);
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
                  {/* Seletor Livre de Cor Personalizada para o Laser */}
                  <label
                    className="relative size-6 rounded-md border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 bg-gradient-to-tr from-rose-500 via-indigo-500 to-emerald-400 shadow-xs"
                    title="Escolher qualquer cor personalizada (Hex/RGB)"
                  >
                    <Pipette className="size-3 text-white drop-shadow" />
                    <input
                      type="color"
                      value={laserColor.startsWith('#') && laserColor.length === 7 ? laserColor : DEFAULT_LASER_COLOR}
                      onChange={(e) => {
                        onSelectLaserColor?.(e.target.value);
                        onSelectTool('laser');
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Ferramentas de Criação e Edição (Ocultas em modo de visualização) */}
          {!readOnly && (
            <>
              {/* Post-it com Seletor de Cores */}
              <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool('sticky');
                    if (selectedColor === '#0f172a' || !STICKY_COLORS.some((c) => c.value === selectedColor)) {
                      onSelectColor('#fff9b1');
                    }
                    setActivePicker(activePicker === 'sticky' ? null : 'sticky');
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    currentTool === 'sticky'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <StickyNote className="size-4" />
                  <span
                    className="absolute bottom-1 right-1 size-1.5 rounded-full border border-background"
                    style={{ backgroundColor: selectedColor }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">
                  {canCommentOnly ? 'Comentário' : 'Post-it'}{' '}
                  <span className="opacity-60 text-[10px]">(N)</span>
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Paleta flutuante do Post-it */}
            {activePicker === 'sticky' && (
              <div className={`absolute ${isBottom ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-0'} bg-popover text-popover-foreground p-1.5 rounded-md shadow-md border border-border flex gap-1 z-40 animate-in fade-in-0 zoom-in-95`}>
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      onSelectColor(c.value);
                      onSelectTool('sticky');
                      setActivePicker(null);
                    }}
                    className={`size-5 rounded transition-transform hover:scale-110 border ${
                      selectedColor === c.value ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Comentário Fixado em Thread (Disponível para Editores e Comentadores) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('comment');
                  setActivePicker(null);
                }}
                className={`size-8 rounded-md transition-colors flex items-center justify-center active:scale-[0.98] ${
                  currentTool === 'comment'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-label="Comentário Fixado em Thread"
              >
                <MessagePin className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="font-medium text-xs">
                Comentário em Thread <span className="opacity-60 text-[10px]">(K)</span>
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Checklist Interativo (Micro-Widget Vivo) */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool('checklist');
                    if (selectedColor === '#0f172a' || !STICKY_COLORS.some((c) => c.value === selectedColor)) {
                      onSelectColor('#ffffff');
                    }
                    setActivePicker(activePicker === 'checklist' ? null : 'checklist');
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    currentTool === 'checklist'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <CheckSquare className="size-4" />
                  <span
                    className="absolute bottom-1 right-1 size-1.5 rounded-full border border-background"
                    style={{ backgroundColor: selectedColor || '#ffffff' }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">
                  Checklist <span className="opacity-60 text-[10px]">(C)</span>
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Paleta flutuante de cor do Checklist */}
            {activePicker === 'checklist' && (
              <div className={`absolute ${isBottom ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-0'} bg-popover text-popover-foreground p-1.5 rounded-md shadow-md border border-border flex gap-1 z-40 animate-in fade-in-0 zoom-in-95`}>
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      onSelectColor(c.value);
                      onSelectTool('checklist');
                      setActivePicker(null);
                    }}
                    className={`size-5 rounded transition-transform hover:scale-110 border ${
                      selectedColor === c.value ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Ferramentas Exclusivas para Edição Completa */}
          {!canCommentOnly && (
            <>
              {/* Formas Geométricas com Submenu (Retângulo, Círculo, Losango, Triângulo, Estrela) */}
              <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool(currentShape);
                    if (isShapeActive) {
                      setActivePicker(activePicker === 'shapes' ? null : 'shapes');
                    }
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    isShapeActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <ActiveShapeIcon className="size-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] opacity-70">▾</span>
                  {isShapeActive && (
                    <span
                      className="absolute bottom-1 right-1 size-1.5 rounded-full border border-background"
                      style={{
                        backgroundColor: selectedColor === 'transparent' ? 'transparent' : (selectedColor || '#ffffff'),
                        backgroundImage: selectedColor === 'transparent' ? 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 0, transparent 4px)' : 'none',
                      }}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">Formas Geométricas <span className="opacity-60 text-[10px]">(R)</span></p>
              </TooltipContent>
            </Tooltip>

            {/* Submenu de Formas Geométricas & Conectores */}
            {activePicker === 'shapes' && (
              <div className={`absolute ${isBottom ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-0'} bg-popover text-popover-foreground p-1 rounded-md shadow-md border border-border flex flex-col gap-0.5 z-40 animate-in fade-in-0 zoom-in-95 w-48`}>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Formas
                </div>
                {SHAPE_OPTIONS.map((shp) => {
                  const SIcon = shp.icon;
                  const isCur = currentTool === shp.id;
                  return (
                    <button
                      key={shp.id}
                      type="button"
                      onClick={() => {
                        setCurrentShape(shp.id);
                        onSelectTool(shp.id);
                        setActivePicker(null);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors text-left ${
                        isCur
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <SIcon className="size-3.5" />
                        <span>{shp.label}</span>
                      </span>
                      {shp.shortcut && (
                        <kbd className={`text-[10px] font-mono ${isCur ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{shp.shortcut}</kbd>
                      )}
                    </button>
                  );
                })}

                {/* Cores rápidas de preenchimento para novas formas */}
                <div className="pt-1.5 mt-0.5 border-t border-border/80">
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Cor Inicial
                  </div>
                  <div className="grid grid-cols-6 gap-1 px-1.5 py-1">
                    {SHAPE_QUICK_SWATCHES.slice(0, 6).map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          onSelectColor(c.value);
                          onSelectTool(currentShape);
                          setActivePicker(null);
                        }}
                        className={`size-5 rounded border transition-transform hover:scale-110 ${
                          selectedColor.toLowerCase() === c.value.toLowerCase() ? 'ring-2 ring-primary ring-offset-1' : 'border-border'
                        }`}
                        style={{
                          backgroundColor: c.value === 'transparent' ? 'transparent' : c.value,
                          backgroundImage: c.value === 'transparent' ? 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 0, transparent 4px)' : 'none',
                        }}
                        title={`Cor padrão: ${c.name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caneta Estilo Miro (Poder de Configuração: Caneta, Marca-texto, Borracha, Espessuras e Cores) */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool(penMode === 'eraser' ? 'eraser' : 'pen');
                    setActivePicker(activePicker === 'pen' ? null : 'pen');
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    isDrawingActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {penMode === 'highlighter' ? (
                    <Highlighter className="size-4" />
                  ) : penMode === 'eraser' ? (
                    <Eraser className="size-4" />
                  ) : (
                    <Pen className="size-4" />
                  )}
                  {penMode !== 'eraser' && (
                    <span
                      className="absolute bottom-1 right-1 size-1.5 rounded-full border border-background"
                      style={{ backgroundColor: selectedColor }}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">Desenho Livre <span className="opacity-60 text-[10px]">(P)</span></p>
                {smartDrawing && (
                  <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5 font-medium">
                    <Wand2 className="size-2.5" />
                    <span>Desenho Inteligente ativo</span>
                  </p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Painel Avançado de Caneta Estilo Miro */}
            {activePicker === 'pen' && (
              <div className={`absolute ${isBottom ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-0'} bg-popover text-popover-foreground p-3 rounded-lg shadow-md border border-border flex flex-col gap-2.5 z-40 animate-in fade-in-0 zoom-in-95 w-56`}>
                {/* 1. Modos de Desenho: Caneta, Marca-texto e Borracha */}
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/60 rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPenMode('pen');
                      onSelectTool('pen');
                    }}
                    className={`flex items-center justify-center py-1 rounded text-xs transition ${
                      penMode === 'pen' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Caneta Normal"
                  >
                    <Pen className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPenMode('highlighter');
                      onSelectTool('pen');
                    }}
                    className={`flex items-center justify-center py-1 rounded text-xs transition ${
                      penMode === 'highlighter' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Marca-texto (Translúcido)"
                  >
                    <Highlighter className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPenMode('eraser');
                      onSelectTool('eraser');
                    }}
                    className={`flex items-center justify-center py-1 rounded text-xs transition ${
                      penMode === 'eraser' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Borracha de Traços"
                  >
                    <Eraser className="size-3.5" />
                  </button>
                </div>

                {/* 2. Seletor de Espessura (com botões de diminuir/aumentar e atalhos rápidos) */}
                {penMode !== 'eraser' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Espessura
                      </span>
                      <div className="flex items-center bg-muted/60 rounded border border-border p-0.5 gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectPenStrokeWidth(Math.max(1, penStrokeWidth - 1))}
                          className="size-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-95"
                          title="Diminuir espessura (-)"
                        >
                          <Minus className="size-2.5" />
                        </button>
                        <span className="text-[10px] font-mono font-semibold px-0.5 text-foreground min-w-[24px] text-center">
                          {penStrokeWidth}px
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectPenStrokeWidth(Math.min(100, penStrokeWidth + 1))}
                          className="size-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition active:scale-95"
                          title="Aumentar espessura (+)"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {PEN_WIDTHS.map((w) => {
                        const isCur = penStrokeWidth === w.value;
                        return (
                          <button
                            key={w.value}
                            type="button"
                            onClick={() => onSelectPenStrokeWidth(w.value)}
                            className={`flex-1 py-1 rounded border text-[10px] font-medium transition flex items-center justify-center ${
                              isCur
                                ? 'bg-primary text-primary-foreground border-primary font-bold'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border'
                            }`}
                          >
                            <span
                              className="rounded-full bg-current"
                              style={{ width: `${Math.min(10, Math.max(3, w.value * 0.7))}px`, height: `${Math.min(10, Math.max(3, w.value * 0.7))}px` }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Paleta Expandida de Cores + Seletor Livre de Qualquer Cor */}
                {penMode !== 'eraser' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Cores da Tinta
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground truncate uppercase max-w-[60px]">
                        {selectedColor}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PEN_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            onSelectColor(c.value);
                            onSelectTool('pen');
                          }}
                          className={`size-6 rounded-md transition-transform hover:scale-110 border ${
                            selectedColor.toLowerCase() === c.value.toLowerCase() ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                      {/* Seletor Livre de Qualquer Cor */}
                      <label
                        className="relative size-6 rounded-md border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-110 bg-gradient-to-tr from-rose-500 via-indigo-500 to-emerald-400 shadow-xs"
                        title="Escolher qualquer cor personalizada (Hex/RGB)"
                      >
                        <Pipette className="size-3 text-white drop-shadow" />
                        <input
                          type="color"
                          value={selectedColor.startsWith('#') && selectedColor.length === 7 ? selectedColor : '#0f172a'}
                          onChange={(e) => {
                            onSelectColor(e.target.value);
                            onSelectTool('pen');
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* 4. Desenho Inteligente (Reconhecimento Automático de Formas Geométricas) */}
                {penMode !== 'eraser' && (
                  <div className="pt-2 border-t border-border/80">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={smartDrawing}
                      onClick={onToggleSmartDrawing}
                      className={`group w-full flex items-center justify-between p-2 rounded-lg text-left transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer border ${
                        smartDrawing
                          ? 'bg-primary/10 border-primary/30 hover:bg-primary/15'
                          : 'bg-muted/30 border-border/70 hover:bg-muted/60'
                      }`}
                      title="Converte círculos, retângulos, triângulos e setas desenhados à mão em formas perfeitas (Shift+P)"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`size-6 rounded-md flex items-center justify-center shrink-0 transition-colors duration-150 ${
                            smartDrawing
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-muted text-muted-foreground group-hover:text-foreground'
                          }`}
                        >
                          <Wand2 className="size-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-foreground tracking-tight">
                              Desenho Inteligente
                            </span>
                            <kbd className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/60">
                              ⇧P
                            </kbd>
                          </div>
                          <span className="text-[9px] text-muted-foreground leading-tight truncate">
                            Converte rabiscos em formas
                          </span>
                        </div>
                      </div>

                      {/* Switch track & thumb animado (Emil Kowalski micro-motion) */}
                      <div
                        className={`relative shrink-0 w-8 h-4.5 rounded-full transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] p-0.5 ml-1.5 ${
                          smartDrawing ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <div
                          className={`size-3.5 rounded-full bg-white dark:bg-card shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                            smartDrawing ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                )}

                {/* 5. Opções Avançadas da Borracha (quando no modo Borracha) */}
                {penMode === 'eraser' && (
                  <div className="space-y-2 pt-1 border-t border-border/80">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Tipo de Borracha
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted/60 rounded-md border border-border">
                      <button
                        type="button"
                        onClick={() => onSelectEraserMode?.('whole')}
                        className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded text-[11px] transition ${
                          eraserMode === 'whole'
                            ? 'bg-background text-foreground shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Apaga o traço ou objeto por inteiro ao tocar nele"
                      >
                        <Layers className="size-3" />
                        <span>Apagar Tudo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectEraserMode?.('partial')}
                        className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded text-[11px] transition ${
                          eraserMode === 'partial'
                            ? 'bg-background text-primary shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Vai apagando aos poucos apenas as partes tocadas do traçado"
                      >
                        <Scissors className="size-3" />
                        <span>Aos Poucos</span>
                      </button>
                    </div>

                    {/* Tamanho da Borracha */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Tamanho da Borracha
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {eraserSize}px
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        {[
                          { label: 'Fina', value: 12 },
                          { label: 'Média', value: 22 },
                          { label: 'Grossa', value: 36 },
                        ].map((sz) => {
                          const isCur = eraserSize === sz.value;
                          return (
                            <button
                              key={sz.value}
                              type="button"
                              onClick={() => onSelectEraserSize?.(sz.value)}
                              className={`flex-1 py-1 rounded border text-[10px] font-medium transition flex items-center justify-center gap-1 ${
                                isCur
                                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                  : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border'
                              }`}
                            >
                              <span
                                className="rounded-full bg-current"
                                style={{ width: `${Math.min(10, Math.max(3, sz.value * 0.35))}px`, height: `${Math.min(10, Math.max(3, sz.value * 0.35))}px` }}
                              />
                              <span>{sz.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-tight px-0.5">
                      {eraserMode === 'whole'
                        ? '• Apaga o elemento ou traço inteiro num único toque.'
                        : '• Recorta e vai apagando o traçado aos poucos conforme passa a borracha.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conectores com Submenu (Seta Conectora e Linha Reta) */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTool(currentConnector);
                    if (isConnectorActive) {
                      setActivePicker(activePicker === 'connectors' ? null : 'connectors');
                    }
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    isConnectorActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <ActiveConnectorIcon className="size-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] opacity-70">▾</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">
                  {activeConnectorOption.label}{' '}
                  <span className="opacity-60 text-[10px]">({activeConnectorOption.shortcut || 'A'})</span>
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Submenu de Conectores (Seta e Linha Reta) */}
            {activePicker === 'connectors' && (
              <div
                className={`absolute ${
                  isBottom ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-0'
                } bg-popover text-popover-foreground p-1 rounded-md shadow-md border border-border flex flex-col gap-0.5 z-40 animate-in fade-in-0 zoom-in-95 w-44`}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Conectores
                </div>
                {CONNECTOR_OPTIONS.map((conn) => {
                  const CIcon = conn.icon;
                  const isCur = currentTool === conn.id;
                  return (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() => {
                        setCurrentConnector(conn.id);
                        onSelectTool(conn.id);
                        setActivePicker(null);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors text-left w-full ${
                        isCur
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CIcon className="size-3.5" />
                        <span>{conn.label}</span>
                      </span>
                      {conn.shortcut && (
                        <kbd
                          className={`text-[10px] font-mono ${
                            isCur ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {conn.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Texto */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('text');
                  setActivePicker(null);
                }}
                className={`size-8 rounded-md transition-colors flex items-center justify-center active:scale-[0.98] ${
                  currentTool === 'text'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Type className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="font-medium text-xs">Texto Livre <span className="opacity-60 text-[10px]">(T)</span></p>
            </TooltipContent>
          </Tooltip>

          {/* Moldura / Área de Sprint */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('frame');
                  setActivePicker(null);
                }}
                className={`size-8 rounded-md transition-colors flex items-center justify-center active:scale-[0.98] ${
                  currentTool === 'frame'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <BoxSelect className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="font-medium text-xs">Moldura <span className="opacity-60 text-[10px]">(F)</span></p>
            </TooltipContent>
          </Tooltip>

          {/* Widgets Estruturados: Tabela, Kanban, Mapa Mental e Bloco de Código */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (isWidgetActive) {
                      setActivePicker(activePicker === 'widgets' ? null : 'widgets');
                    } else {
                      setActivePicker(activePicker === 'widgets' ? null : 'widgets');
                      onSelectTool(currentWidget);
                    }
                  }}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center relative active:scale-[0.98] ${
                    isWidgetActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label="Tabela, Kanban, Mapa Mental e Código"
                >
                  <ActiveWidgetIcon className="size-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] opacity-70">▾</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">{activeWidgetOption.label}</p>
              </TooltipContent>
            </Tooltip>

            {activePicker === 'widgets' && (
              <div
                className={`absolute ${
                  isBottom ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' : 'left-full ml-2 top-0'
                } bg-popover text-popover-foreground p-1 rounded-md shadow-md border border-border flex flex-col gap-0.5 z-40 animate-in fade-in-0 zoom-in-95 w-48`}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Widgets & Ferramentas
                </div>
                {WIDGET_OPTIONS.map((w) => {
                  const WIcon = w.icon;
                  const isCur = currentTool === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setCurrentWidget(w.id);
                        onSelectTool(w.id);
                        setActivePicker(null);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition cursor-pointer ${
                        isCur
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <WIcon className="size-3.5 shrink-0" />
                      <span>{w.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Templates de Sprint e Frameworks (Padrão Miro & FigJam na barra de ferramentas) */}
          {onOpenTemplates && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setActivePicker(null);
                    onOpenTemplates();
                  }}
                  className="size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center active:scale-[0.98]"
                  aria-label="Inserir Templates de Sprint"
                >
                  <LayoutTemplate className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">Templates de Sprint <span className="opacity-60 text-[10px]">(S)</span></p>
              </TooltipContent>
            </Tooltip>
          )}
          </>
          )}
          </>
        )}
        </div>

        {/* Separador e Ferramentas Adicionais (Stickers, Exclusão, Desfazer/Refazer) */}
        {!readOnly && (
          <>
            {/* Botão de Stickers e GIFs (Apenas Modo Edição Completa) */}
            {!canCommentOnly && (
              <>
                <div className={`${isBottom ? 'h-5 w-px mx-1' : 'w-5 h-px my-1'} bg-border`} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onOpenStickersModal}
                      className="size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center active:scale-[0.98]"
                    >
                      <Smile className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={tooltipSide}>
                    <p className="font-medium text-xs">Imagens, Stickers & GIFs <span className="opacity-60 text-[10px]">(U)</span></p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            {/* Separador */}
            <div className={`${isBottom ? 'h-5 w-px mx-1' : 'w-5 h-px my-1'} bg-border`} />

            {/* Botão de Deletar Selecionado(s) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  disabled={!hasSelection}
                  className={`size-8 rounded-md transition-colors flex items-center justify-center active:scale-[0.98] ${
                    hasSelection
                      ? 'text-destructive hover:bg-destructive/10 cursor-pointer'
                      : 'text-muted-foreground/30 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="font-medium text-xs">
                  {selectionCount > 1 ? `Excluir ${selectionCount} Selecionados` : 'Excluir Selecionado'}{' '}
                  <span className="opacity-60 text-[10px]">(Del)</span>
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* 2. Controles Minimalistas de Navegação no Canto Inferior DIREITO */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center bg-background/85 dark:bg-card/85 backdrop-blur-md rounded-xl shadow-xs border border-border/80 px-1.5 py-1 gap-1 select-none">
        {/* Desfazer e Refazer Rápidos */}
        {!readOnly && !canCommentOnly && (
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.96] cursor-pointer"
                >
                  <Undo2 className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Desfazer (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.96] cursor-pointer"
                >
                  <Redo2 className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Refazer (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Coordenadas X e Y compactas (apenas em telas grandes) */}
        <div className="hidden xl:flex text-[10px] font-mono text-muted-foreground/75 px-1 items-center gap-1 select-none">
          <CursorCoordinates />
        </div>

        {/* Divisor vertical */}
        <div className="h-3.5 w-px bg-border/60" />

        {/* Chat do Cursor */}
        {onToggleCursorChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-cursor-chat-toggle="true"
                onClick={onToggleCursorChat}
                className={`size-6 rounded-md transition flex items-center justify-center active:scale-[0.96] cursor-pointer ${
                  isCursorChatOpen
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <MessageSquare className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="flex items-center gap-1.5">
                <span>Chat do Cursor</span>
                <kbd className="px-1 py-0.2 bg-muted text-[10px] font-mono rounded border border-border">/</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Pílula de Zoom Minimalista */}
        <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onZoomOut}
                className="size-5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition flex items-center justify-center active:scale-[0.96] cursor-pointer"
              >
                <ZoomOut className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Diminuir Zoom (-)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onResetZoom}
                className="text-[11px] font-mono font-semibold px-1.5 text-foreground hover:bg-muted py-0.5 rounded transition flex items-center gap-0.5 active:scale-[0.96] cursor-pointer tabular-nums"
              >
                <span>{Math.round(scale * 100)}%</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Redefinir Zoom para 100% (Ctrl+0)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onZoomIn}
                className="size-5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition flex items-center justify-center active:scale-[0.96] cursor-pointer"
              >
                <ZoomIn className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Aumentar Zoom (+)</TooltipContent>
          </Tooltip>
        </div>

        {(onToggleMinimap || onOpenShortcuts) && (
          <div className="h-3.5 w-px bg-border/60" />
        )}

        {/* Botão Rápido do Minimapa (ao lado do Zoom e do ?) */}
        {onToggleMinimap && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-minimap-toggle="true"
                aria-label={showMinimap ? 'Ocultar Minimapa' : 'Abrir Minimapa'}
                aria-pressed={showMinimap}
                onClick={onToggleMinimap}
                className={`size-6 rounded-md transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center active:scale-[0.96] cursor-pointer ${
                  showMinimap
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Map className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="flex items-center gap-1.5">
                <span>{showMinimap ? 'Ocultar Minimapa' : 'Minimapa do Quadro'}</span>
                <kbd className="px-1 py-0.2 bg-muted text-[10px] font-mono rounded border border-border">M</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Botão de Ajuda & Atalhos (?) */}
        {onOpenShortcuts && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Atalhos do Teclado"
                onClick={onOpenShortcuts}
                className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center active:scale-[0.96] cursor-pointer font-bold text-xs"
              >
                <HelpCircle className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="flex items-center gap-1.5">
                <span>Atalhos do Teclado</span>
                <kbd className="px-1 py-0.2 bg-muted text-[10px] font-mono rounded border border-border">?</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  );
});

Toolbar.displayName = 'Toolbar';
