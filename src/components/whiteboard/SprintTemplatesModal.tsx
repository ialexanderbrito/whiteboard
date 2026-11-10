import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  Plus, 
  Check,
  Search,
  X
} from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  SPRINT_TEMPLATES, 
  TEMPLATE_CATEGORIES, 
  type SprintTemplate, 
  type TemplateRoleCategory 
} from '@/utils/sprintTemplates';
import { TemplateSchematicPreview } from './QuickStartTemplatesStrip';

interface SprintTemplatesModalProps {
  onInsertTemplate: (template: SprintTemplate) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SprintTemplatesModal: React.FC<SprintTemplatesModalProps> = ({
  onInsertTemplate,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen;

  const [selectedTemplate, setSelectedTemplate] = useState<SprintTemplate>(SPRINT_TEMPLATES[0]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateRoleCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    return SPRINT_TEMPLATES.filter((tmpl) => {
      const matchesCategory =
        selectedCategory === 'all' || tmpl.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tmpl.title.toLowerCase().includes(q) ||
        (tmpl.shortTitle && tmpl.shortTitle.toLowerCase().includes(q)) ||
        tmpl.description.toLowerCase().includes(q) ||
        tmpl.badge.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleInsert = () => {
    onInsertTemplate(selectedTemplate);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(!isControlled || trigger) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              {trigger ? (
                trigger
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="group h-8 gap-2 px-2.5 text-xs font-medium rounded-lg border border-border bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs hover:bg-muted/80 active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer"
                >
                  <div className="flex size-4 items-center justify-center rounded bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-150">
                    <LayoutGrid className="size-3" />
                  </div>
                  <span className="text-foreground">Templates</span>
                </Button>
              )}
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Inserir Templates de Sprint</TooltipContent>
        </Tooltip>
      )}

      <DialogContent className="max-w-3xl p-5 sm:p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <LayoutGrid className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <span>Templates de Sprint & Frameworks</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {SPRINT_TEMPLATES.length} modelos
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Modelos prontos com a mesma arquitetura visual da tela inicial para acelerar dinâmicas e planejamento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Filtros: Categorias por Perfil + Busca Rápida (Idêntica à hierarquia da tela inicial) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Segmented Control de Categorias (Emil Kowalski) */}
          <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-muted/60 rounded-lg border border-border/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isCatSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-7 px-2.5 text-xs font-medium rounded-md transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    isCatSelected
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 sm:max-w-[210px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-background/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                title="Limpar busca"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Grade de Cards com Miniaturas Arquiteturais SVG (Idêntico ao QuickStartTemplatesStrip da Tela Principal) */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[280px] overflow-y-auto p-0.5 pr-1.5 [scrollbar-width:thin]">
            {filteredTemplates.map((tmpl) => {
              const isSelected = selectedTemplate.id === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`group relative text-left rounded-lg border transition-[border-color,box-shadow,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                      : 'border-border/80 bg-background hover:border-foreground/30 hover:shadow-xs'
                  }`}
                >
                  {/* Miniatura Esquema SVG com padrão radial e dot grid */}
                  <div className="relative h-20 w-full rounded-t-lg border-b border-border/60 bg-muted/25 overflow-hidden flex items-center justify-center p-1">
                    <div
                      className="absolute inset-0 opacity-[0.3] dark:opacity-[0.18]"
                      style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '12px 12px',
                      }}
                    />
                    <div className="relative z-10 w-full h-full group-hover:scale-[1.03] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]">
                      <TemplateSchematicPreview variant={tmpl.previewVariant} />
                    </div>

                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 z-20 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs animate-in zoom-in-90 duration-150">
                        <Check className="size-3" />
                      </span>
                    )}
                  </div>

                  {/* Rodapé do Card */}
                  <div className="p-2">
                    <p
                      className={`text-xs font-semibold truncate transition-colors ${
                        isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                      }`}
                      title={tmpl.title}
                    >
                      {tmpl.shortTitle || tmpl.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {tmpl.badge}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-xs font-semibold text-foreground">Nenhum template encontrado</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tente buscar por outro termo ou selecione a categoria "Todos".
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-3 h-7 text-xs"
            >
              Limpar filtros
            </Button>
          </div>
        )}

        {/* Painel de Detalhes e Pré-visualização Fiel das Raias do Template Selecionado */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {selectedTemplate.title}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 font-normal shrink-0">
                  {selectedTemplate.badge}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {selectedTemplate.description}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {selectedTemplate.columns.length} raias
            </span>
          </div>

          {/* Raias Renderizadas com Cores e Post-its Autênticos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            {selectedTemplate.columns.map((col, idx) => (
              <div
                key={idx}
                className="flex flex-col rounded-md border border-dashed overflow-hidden shadow-2xs"
                style={{
                  borderColor: col.frameStroke,
                  backgroundColor: col.frameFill,
                }}
              >
                {/* Aba Superior com Stroke */}
                <div
                  className="px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-xs truncate"
                  style={{ backgroundColor: col.frameStroke }}
                >
                  <span className="truncate">{col.title}</span>
                </div>

                {/* Post-it de Exemplo no Interior */}
                <div className="p-1.5 flex-1 flex flex-col justify-start min-h-[72px]">
                  <div
                    className="p-1.5 rounded shadow-2xs border border-black/10 text-zinc-900 flex flex-col justify-between"
                    style={{ backgroundColor: col.stickyFill }}
                  >
                    <p className="text-[9.5px] font-medium leading-tight line-clamp-2">
                      {col.cards?.[0] || 'Card de exemplo'}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[8px] text-zinc-600 font-mono">
                      <span>#card-0{idx + 1}</span>
                      <span>✨</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé: Contexto, Cancelar e Ação Principal */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            As raias serão inseridas no centro da sua visualização atual.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs cursor-pointer active:scale-[0.97]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleInsert}
              size="sm"
              className="gap-1.5 h-8 text-xs font-medium shadow-xs cursor-pointer active:scale-[0.97]"
            >
              <Plus className="size-3.5" />
              <span>Inserir no Quadro</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
