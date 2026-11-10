import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
  Filter,
  Check,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SPRINT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type SprintTemplate,
  type TemplateRoleCategory,
  type TemplatePreviewVariant,
} from '@/utils/sprintTemplates';

const COLLAPSE_STORAGE_KEY = 'mirio_quick_templates_collapsed';

interface QuickStartTemplatesStripProps {
  userName?: string;
  onCreateBlankBoard: () => void;
  onQuickCreateFromTemplate: (template: SprintTemplate) => void;
  creatingTemplateId?: string | null;
  isCreating?: boolean;
}

/**
 * Renderiza miniaturas SVG arquiteturais sob medida para cada categoria de template,
 * mantendo coerência estética com o BoardCardPreview do Dashboard.
 */
export const TemplateSchematicPreview: React.FC<{ variant: TemplatePreviewVariant }> = React.memo(
  ({ variant }) => {
    switch (variant) {
      case 'retro_4ls':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {[
              { x: 12, stroke: '#e11d48', fill: '#fecdd3' },
              { x: 51, stroke: '#059669', fill: '#a7f3d0' },
              { x: 90, stroke: '#ca8a04', fill: '#fef08a' },
              { x: 129, stroke: '#2563eb', fill: '#bfdbfe' },
            ].map((col, idx) => (
              <g key={idx}>
                <rect
                  x={col.x}
                  y="14"
                  width="35"
                  height="72"
                  rx="4"
                  fill="currentColor"
                  className="text-background/90 dark:text-zinc-900/90"
                  stroke={col.stroke}
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
                <rect
                  x={col.x}
                  y="14"
                  width="35"
                  height="9"
                  rx="3"
                  fill={col.stroke}
                  fillOpacity="0.85"
                />
                <rect x={col.x + 4} y="28" width="27" height="16" rx="2.5" fill={col.fill} />
                <line
                  x1={col.x + 7}
                  y1="34"
                  x2={col.x + 25}
                  y2="34"
                  stroke="#0f172a"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <rect x={col.x + 4} y="48" width="27" height="16" rx="2.5" fill={col.fill} />
                <line
                  x1={col.x + 7}
                  y1="54"
                  x2={col.x + 22}
                  y2="54"
                  stroke="#0f172a"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <rect
                  x={col.x + 4}
                  y="68"
                  width="27"
                  height="12"
                  rx="2"
                  fill={col.fill}
                  fillOpacity="0.7"
                />
              </g>
            ))}
          </svg>
        );

      case 'flowchart':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Círculo Inicial */}
            <circle
              cx="26"
              cy="50"
              r="12"
              fill="#bbf7d0"
              stroke="#059669"
              strokeWidth="1.4"
            />
            <line x1="39" y1="50" x2="52" y2="50" stroke="#64748b" strokeWidth="1.5" />
            {/* Nó API Gateway */}
            <rect
              x="53"
              y="38"
              width="32"
              height="24"
              rx="4"
              fill="#bae6fd"
              stroke="#0284c7"
              strokeWidth="1.4"
            />
            <line x1="86" y1="50" x2="98" y2="50" stroke="#64748b" strokeWidth="1.5" />
            {/* Losango de Decisão */}
            <polygon
              points="114,32 132,50 114,68 96,50"
              fill="#fef08a"
              stroke="#ca8a04"
              strokeWidth="1.4"
            />
            {/* Ramo Superior (Sucesso) */}
            <path
              d="M 126 42 L 138 28 L 144 28"
              fill="none"
              stroke="#059669"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <rect
              x="144"
              y="18"
              width="24"
              height="20"
              rx="3.5"
              fill="#bbf7d0"
              stroke="#059669"
              strokeWidth="1.3"
            />
            {/* Ramo Inferior (Erro 401) */}
            <path
              d="M 126 58 L 138 72 L 144 72"
              fill="none"
              stroke="#e11d48"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <rect
              x="144"
              y="62"
              width="24"
              height="20"
              rx="3.5"
              fill="#fecdd3"
              stroke="#e11d48"
              strokeWidth="1.3"
            />
          </svg>
        );

      case 'roadmap':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Barra de Timeline Q1-Q4 */}
            <rect x="14" y="14" width="36" height="10" rx="3" fill="#10b981" fillOpacity="0.85" />
            <rect x="54" y="14" width="36" height="10" rx="3" fill="#3b82f6" fillOpacity="0.85" />
            <rect x="94" y="14" width="36" height="10" rx="3" fill="#8b5cf6" fillOpacity="0.85" />
            <rect x="134" y="14" width="32" height="10" rx="3" fill="#f59e0b" fillOpacity="0.85" />
            {/* Barras de entregas horizontais estilo Gantt/Roadmap */}
            <rect
              x="14"
              y="30"
              width="64"
              height="14"
              rx="3.5"
              fill="#bbf7d0"
              stroke="#059669"
              strokeWidth="1.1"
            />
            <rect
              x="34"
              y="49"
              width="74"
              height="14"
              rx="3.5"
              fill="#bae6fd"
              stroke="#0284c7"
              strokeWidth="1.1"
            />
            <rect
              x="82"
              y="68"
              width="68"
              height="14"
              rx="3.5"
              fill="#ddd6fe"
              stroke="#7c3aed"
              strokeWidth="1.1"
            />
            <circle cx="156" cy="37" r="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
          </svg>
        );

      case 'prototype':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {[
              { x: 15, stroke: '#0284c7', hero: '#bae6fd', cta: '#0284c7' },
              { x: 69, stroke: '#7c3aed', hero: '#ddd6fe', cta: '#7c3aed' },
              { x: 123, stroke: '#059669', hero: '#bbf7d0', cta: '#059669' },
            ].map((scr, idx) => (
              <g key={idx}>
                <rect
                  x={scr.x}
                  y="14"
                  width="42"
                  height="72"
                  rx="5"
                  fill="currentColor"
                  className="text-background/95 dark:text-zinc-900/95"
                  stroke={scr.stroke}
                  strokeWidth="1.3"
                />
                {/* Top bar */}
                <rect x={scr.x + 4} y="19" width="34" height="6" rx="1.5" fill="#94a3b8" fillOpacity="0.35" />
                {/* Hero block */}
                <rect x={scr.x + 4} y="28" width="34" height="22" rx="2.5" fill={scr.hero} />
                {/* CTA button */}
                <rect x={scr.x + 4} y="54" width="34" height="9" rx="2" fill={scr.cta} />
                {/* Sticky note */}
                <rect x={scr.x + 4} y="67" width="34" height="14" rx="2" fill="#fef08a" />
                {idx < 2 && (
                  <line
                    x1={scr.x + 43}
                    y1="48"
                    x2={scr.x + 53}
                    y2="48"
                    stroke="#64748b"
                    strokeWidth="1.4"
                    strokeDasharray="2 1.5"
                  />
                )}
              </g>
            ))}
          </svg>
        );

      case 'eisenhower':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* 4 Quadrantes 2x2 */}
            <rect
              x="16"
              y="12"
              width="70"
              height="36"
              rx="4"
              fill="#fecdd3"
              stroke="#ef4444"
              strokeWidth="1.2"
            />
            <rect
              x="94"
              y="12"
              width="70"
              height="36"
              rx="4"
              fill="#bae6fd"
              stroke="#3b82f6"
              strokeWidth="1.2"
            />
            <rect
              x="16"
              y="52"
              width="70"
              height="36"
              rx="4"
              fill="#fef08a"
              stroke="#eab308"
              strokeWidth="1.2"
            />
            <rect
              x="94"
              y="52"
              width="70"
              height="36"
              rx="4"
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1.2"
            />
            {/* Linhas internas simulando post-its */}
            <rect x="22" y="18" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="52" y="18" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="100" y="18" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="22" y="58" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
            <rect x="100" y="58" width="26" height="14" rx="2" fill="#ffffff" fillOpacity="0.75" />
          </svg>
        );

      case 'crazy8s':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {[0, 1, 2, 3].map((col) =>
              [0, 1].map((row) => {
                const fills = ['#fef08a', '#bbf7d0', '#bae6fd', '#ddd6fe'];
                const strokes = ['#ca8a04', '#16a34a', '#0284c7', '#7c3aed'];
                const colorIdx = (col + row) % 4;
                return (
                  <rect
                    key={`${col}-${row}`}
                    x={16 + col * 38}
                    y={16 + row * 36}
                    width="32"
                    height="30"
                    rx="3.5"
                    fill={fills[colorIdx]}
                    stroke={strokes[colorIdx]}
                    strokeWidth="1.2"
                  />
                );
              })
            )}
          </svg>
        );

      case 'lean_canvas':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Grade Clássica do Lean Canvas */}
            <rect x="14" y="14" width="28" height="48" rx="3" fill="#fecdd3" stroke="#f43f5e" strokeWidth="1.1" />
            <rect x="45" y="14" width="28" height="22" rx="3" fill="#bbf7d0" stroke="#10b981" strokeWidth="1.1" />
            <rect x="45" y="40" width="28" height="22" rx="3" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.1" />
            <rect x="76" y="14" width="28" height="48" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.2" />
            <rect x="107" y="14" width="28" height="22" rx="3" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.1" />
            <rect x="107" y="40" width="28" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.1" />
            <rect x="138" y="14" width="28" height="48" rx="3" fill="#bbf7d0" stroke="#059669" strokeWidth="1.1" />
            {/* Base de Custos & Receitas */}
            <rect x="14" y="66" width="74" height="20" rx="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.1" />
            <rect x="92" y="66" width="74" height="20" rx="3" fill="#a7f3d0" stroke="#059669" strokeWidth="1.1" />
          </svg>
        );

      case 'story_map':
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {/* Backbone Horizontal */}
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`top-${i}`}
                x={14 + i * 39}
                y="14"
                width="35"
                height="14"
                rx="3"
                fill="#ddd6fe"
                stroke="#7c3aed"
                strokeWidth="1.2"
              />
            ))}
            <line x1="12" y1="34" x2="168" y2="34" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            {/* Slices MVP */}
            {[0, 1, 2, 3].map((i) => (
              <g key={`slice-${i}`}>
                <rect x={14 + i * 39} y="40" width="35" height="18" rx="2.5" fill="#bbf7d0" stroke="#059669" strokeWidth="1.1" />
                <rect x={14 + i * 39} y="64" width="35" height="18" rx="2.5" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.1" />
              </g>
            ))}
          </svg>
        );

      case 'kanban':
      case 'retro_agile':
      case 'daily':
      case 'retro_focus':
      default: {
        const isThreeCols = variant === 'retro_agile' || variant === 'daily' || variant === 'retro_focus';
        const cols = isThreeCols
          ? [
              { x: 16, w: 44, stroke: '#10b981', fill: '#bbf7d0' },
              { x: 68, w: 44, stroke: '#3b82f6', fill: '#bae6fd' },
              { x: 120, w: 44, stroke: '#8b5cf6', fill: '#ddd6fe' },
            ]
          : [
              { x: 12, w: 35, stroke: '#64748b', fill: '#fef08a' },
              { x: 51, w: 35, stroke: '#3b82f6', fill: '#bae6fd' },
              { x: 90, w: 35, stroke: '#a855f7', fill: '#f5d0fe' },
              { x: 129, w: 35, stroke: '#10b981', fill: '#bbf7d0' },
            ];
        return (
          <svg viewBox="0 0 180 100" className="w-full h-full" aria-hidden="true">
            {cols.map((col, idx) => (
              <g key={idx}>
                <rect
                  x={col.x}
                  y="14"
                  width={col.w}
                  height="72"
                  rx="4"
                  fill="currentColor"
                  className="text-background/90 dark:text-zinc-900/90"
                  stroke={col.stroke}
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
                <rect x={col.x} y="14" width={col.w} height="8" rx="2.5" fill={col.stroke} fillOpacity="0.85" />
                <rect x={col.x + 4} y="27" width={col.w - 8} height="16" rx="2.5" fill={col.fill} />
                <rect x={col.x + 4} y="47" width={col.w - 8} height="16" rx="2.5" fill={col.fill} />
                <rect x={col.x + 4} y="67" width={col.w - 8} height="13" rx="2" fill={col.fill} fillOpacity="0.7" />
              </g>
            ))}
          </svg>
        );
      }
    }
  }
);

TemplateSchematicPreview.displayName = 'TemplateSchematicPreview';

export const QuickStartTemplatesStrip: React.FC<QuickStartTemplatesStripProps> = ({
  userName,
  onCreateBlankBoard,
  onQuickCreateFromTemplate,
  creatingTemplateId,
  isCreating = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateRoleCategory>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const firstName = (userName || 'Visitante').trim().split(/\s+/)[0];

  const filteredTemplates =
    selectedCategory === 'all'
      ? SPRINT_TEMPLATES
      : SPRINT_TEMPLATES.filter((t) => t.category === selectedCategory);

  const selectedCategoryObj =
    TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory) || TEMPLATE_CATEGORIES[0];

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [updateScrollButtons, filteredTemplates.length, isCollapsed]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = Math.max(320, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignora
      }
      return next;
    });
  };

  if (isCollapsed) {
    return (
      <section
        aria-label="Comece algo novo"
        className="mb-6 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate">
            Olá, {firstName} • Comece algo novo
          </span>
          <div className="hidden md:flex items-center gap-1.5 ml-1">
            {SPRINT_TEMPLATES.slice(0, 3).map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                disabled={isCreating}
                onClick={() => onQuickCreateFromTemplate(tmpl)}
                className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.97] cursor-pointer"
              >
                + {tmpl.shortTitle || tmpl.title}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer active:scale-[0.97]"
        >
          <span>Mostrar templates</span>
          <ChevronDown className="size-3.5" />
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label="Comece algo novo"
      className="mb-7 rounded-xl border border-border/80 bg-gradient-to-b from-muted/35 via-card/60 to-card p-4 sm:p-5 shadow-2xs"
    >
      {/* Barra Superior: Saudação Pessoal + Seletor de Perfil ("Templates para: Todos os perfis") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Olá, <span className="text-foreground font-semibold">{firstName}</span>
          </p>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground mt-0.5">
            Comece algo novo
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Filtro por Perfil ("Templates para: Todos os perfis") */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              Templates para:
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-background/80 border-border/80 cursor-pointer active:scale-[0.97]"
                >
                  <Filter className="size-3 text-muted-foreground" />
                  <span>{selectedCategoryObj.label}</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>{cat.label}</span>
                    {selectedCategory === cat.id && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Controles de Navegação do Carrossel (Desktop) + Botão de Recolher */}
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canScrollLeft}
                onClick={() => handleScroll('left')}
                className="size-7 rounded-md bg-background/80 disabled:opacity-35 cursor-pointer active:scale-[0.97]"
                title="Rolar templates para a esquerda"
                aria-label="Rolar templates para a esquerda"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canScrollRight}
                onClick={() => handleScroll('right')}
                className="size-7 rounded-md bg-background/80 disabled:opacity-35 cursor-pointer active:scale-[0.97]"
                title="Rolar templates para a direita"
                aria-label="Rolar templates para a direita"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer active:scale-[0.97]"
              title="Ocultar faixa de templates iniciais"
            >
              <span className="hidden sm:inline">Recolher</span>
              <ChevronUp className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Trilho Horizontal de Cards: "Quadro em Branco" + Templates Prontos */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButtons}
        className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* 1. Card Fixo: Quadro em Branco (Blank board - 1 clique direto) */}
        <div className="w-[152px] sm:w-[168px] shrink-0 snap-start">
          <button
            type="button"
            disabled={isCreating}
            onClick={onCreateBlankBoard}
            className="group w-full text-left rounded-lg border border-border/80 bg-background hover:border-foreground/30 transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-sm active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            <div className="relative h-24 w-full rounded-t-lg border-b border-border/60 bg-muted/25 overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />
              <div className="relative z-10 size-10 rounded-full border border-border bg-background shadow-xs flex items-center justify-center text-foreground group-hover:scale-105 group-hover:border-primary/50 group-hover:text-primary transition-[transform,border-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]">
                <Plus className="size-5" />
              </div>

              {creatingTemplateId === 'blank' && (
                <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Criando...</span>
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                Quadro em branco
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                Começar do zero
              </p>
            </div>
          </button>
        </div>

        {/* 2. Cards de Templates Filtrados por Perfil (100% limpos, 1 clique direto) */}
        {filteredTemplates.map((tmpl) => {
          const isThisCreating = creatingTemplateId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              className="group relative w-[158px] sm:w-[174px] shrink-0 snap-start"
            >
              <button
                type="button"
                disabled={isCreating}
                onClick={() => onQuickCreateFromTemplate(tmpl)}
                className="w-full text-left rounded-lg border border-border/80 bg-background hover:border-foreground/30 transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-sm active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                {/* Miniatura Esquema SVG */}
                <div className="relative h-24 w-full rounded-t-lg border-b border-border/60 bg-muted/25 overflow-hidden flex items-center justify-center p-1">
                  <div
                    className="absolute inset-0 opacity-[0.3] dark:opacity-[0.18]"
                    style={{
                      backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                      backgroundSize: '12px 12px',
                    }}
                  />
                  <div className="relative z-10 w-full h-full group-hover:scale-[1.03] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]">
                    <TemplateSchematicPreview variant={tmpl.previewVariant} />
                  </div>

                  {isThisCreating && (
                    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span>Criando...</span>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card */}
                <div className="p-2.5">
                  <p
                    className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors"
                    title={tmpl.title}
                  >
                    {tmpl.shortTitle || tmpl.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {tmpl.badge}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
