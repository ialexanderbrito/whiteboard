import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Code2,
  Crop,
  ExternalLink,
  GitBranch,
  Minus,
  Plus,
  Sun,
  Moon,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CanvasElement } from '../../../types/element';
import {
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  computeKanbanDimensions,
  createDefaultKanbanColumns,
} from '../../../utils/tableAndKanban';
import { isMindMapNode } from '../../../utils/mindMap';
import {
  CODE_LANGUAGE_GROUPS,
  getCodeLanguageAccent,
  getCodeLanguageLabel,
  getDefaultCodeSnippet,
  isUntouchedDefaultCodeSnippet,
  normalizeCodeLanguage,
} from '../../../utils/richEmbeds';
import { normalizeUrl } from '../../../utils/textLinks';

interface SpecializedElementControlsProps {
  element: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onOpenCropModal?: (elementId: string) => void;
  onSpawnMindMapNode?: (elementId: string, mode: 'child' | 'sibling') => void;
}

const CODE_FONT_SIZES = [11, 12, 13, 14, 16, 18, 20, 24];

export const SpecializedElementControls: React.FC<SpecializedElementControlsProps> = ({
  element,
  onUpdateElement,
  onOpenCropModal,
  onSpawnMindMapNode,
}) => {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isCodeFontSelectOpen, setIsCodeFontSelectOpen] = useState(false);

  // Permite abrir o seletor de linguagem também ao clicar no badge de linguagem do cabeçalho no canvas
  useEffect(() => {
    if (element.type !== 'code' || typeof window === 'undefined') return;

    let rafId: number | null = null;
    const w = window as unknown as {
      __mirio_open_code_lang_for?: { id: string; ts: number };
    };

    if (
      w.__mirio_open_code_lang_for &&
      w.__mirio_open_code_lang_for.id === element.id &&
      Date.now() - w.__mirio_open_code_lang_for.ts < 500
    ) {
      w.__mirio_open_code_lang_for = undefined;
      rafId = requestAnimationFrame(() => setIsLanguageOpen(true));
    }

    const handleOpenFromCanvas = (evt: Event) => {
      const detail = (evt as CustomEvent<{ elementId?: string }>).detail;
      if (detail?.elementId === element.id) {
        w.__mirio_open_code_lang_for = undefined;
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => setIsLanguageOpen(true));
      }
    };

    window.addEventListener('mirio:open-code-language-picker', handleOpenFromCanvas);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('mirio:open-code-language-picker', handleOpenFromCanvas);
    };
  }, [element.id, element.type]);

  // 1. Controles de Tabela Editável
  if (element.type === 'table') {
    return (
      <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border">
        <button
          type="button"
          onClick={() => onUpdateElement(element.id, addTableRow(element))}
          className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Adicionar linha"
        >
          <Plus className="size-3 text-muted-foreground" />
          <span>Linha</span>
        </button>
        <button
          type="button"
          onClick={() => onUpdateElement(element.id, removeTableRow(element))}
          className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Remover última linha"
        >
          <Minus className="size-3" />
        </button>
        <div className="w-px h-3.5 bg-border mx-0.5" />
        <button
          type="button"
          onClick={() => onUpdateElement(element.id, addTableColumn(element))}
          className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Adicionar coluna"
        >
          <Plus className="size-3 text-muted-foreground" />
          <span>Coluna</span>
        </button>
        <button
          type="button"
          onClick={() => onUpdateElement(element.id, removeTableColumn(element))}
          className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Remover última coluna"
        >
          <Minus className="size-3" />
        </button>
      </div>
    );
  }

  // 2. Controles de Quadro Kanban Nativo
  if (element.type === 'kanban') {
    const cols =
      element.kanbanColumns && element.kanbanColumns.length > 0
        ? element.kanbanColumns
        : createDefaultKanbanColumns();

    return (
      <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border">
        <button
          type="button"
          onClick={() => {
            const nextCols = [
              ...cols,
              {
                id: `col_${Date.now().toString(36)}`,
                title: `Etapa ${cols.length + 1}`,
                color: '#8b5cf6',
                cards: [],
              },
            ];
            const dims = computeKanbanDimensions(nextCols);
            onUpdateElement(element.id, {
              kanbanColumns: nextCols,
              width: dims.width,
              height: dims.height,
            });
          }}
          className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Adicionar nova coluna ao Kanban"
        >
          <Plus className="size-3 text-muted-foreground" />
          <span>Coluna</span>
        </button>
        {cols.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const nextCols = cols.slice(0, -1);
              const dims = computeKanbanDimensions(nextCols);
              onUpdateElement(element.id, {
                kanbanColumns: nextCols,
                width: dims.width,
                height: dims.height,
              });
            }}
            className="h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
            title="Remover última coluna"
          >
            <Minus className="size-3" />
            <span>Coluna</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Controles de Bloco de Código / Markdown (Combobox pesquisável + Select numérico nativo da barra)
  if (element.type === 'code') {
    const isLight = element.codeTheme === 'light';
    const currentLang = normalizeCodeLanguage(element.codeLanguage);
    const currentLabel = getCodeLanguageLabel(currentLang);
    const currentFontSize = element.fontSize || 13;

    return (
      <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border shrink-0 whitespace-nowrap">
        {/* Combobox de Linguagem (Popover + Command) — pesquisa instantânea, teclado e zero duplicidade */}
        <Popover
          open={isLanguageOpen}
          onOpenChange={(open) => {
            setIsLanguageOpen(open);
            if (!open && typeof window !== 'undefined') {
              (window as unknown as Record<string, number>).__mirio_menu_dismissed_at = Date.now();
            }
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={isLanguageOpen}
                  aria-label="Linguagem do bloco de código"
                  className="group h-7 px-2 gap-1.5 rounded-md bg-transparent hover:bg-muted data-[state=open]:bg-muted text-xs font-medium text-foreground inline-flex flex-row flex-nowrap items-center shrink-0 whitespace-nowrap transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Code2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[120px] font-medium tracking-tight leading-none">
                    {currentLabel}
                  </span>
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground/70 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[state=open]:rotate-180" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Linguagem ({currentLabel})</TooltipContent>
          </Tooltip>

          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={() => {
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, number>).__mirio_menu_dismissed_at = Date.now();
              }
            }}
            onInteractOutside={() => {
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, number>).__mirio_menu_dismissed_at = Date.now();
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') e.stopPropagation();
            }}
            className="w-56 p-0 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-xl"
          >
            <Command className="rounded-xl bg-popover [&_[cmdk-input-wrapper]]:px-2.5 [&_[cmdk-input-wrapper]]:border-border/60 [&_[cmdk-input-wrapper]_svg]:mr-2 [&_[cmdk-input-wrapper]_svg]:size-3.5">
              <CommandInput
                placeholder="Buscar linguagem..."
                aria-label="Buscar linguagem"
                className="h-8 py-1.5 text-xs font-normal"
              />
              <CommandList className="max-h-60 overflow-y-auto p-1 custom-scrollbar-thin">
                <CommandEmpty className="py-5 text-center text-xs text-muted-foreground">
                  Nenhuma linguagem encontrada
                </CommandEmpty>
                {CODE_LANGUAGE_GROUPS.map((group, groupIdx) => (
                  <React.Fragment key={group.label}>
                    {groupIdx > 0 && <CommandSeparator className="my-1 bg-border/50" />}
                    <CommandGroup
                      heading={group.label}
                      className="p-0.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/75"
                    >
                      {group.items.map((lang) => {
                        const isCurrent = lang.id === currentLang;
                        return (
                          <CommandItem
                            key={lang.id}
                            value={lang.id}
                            keywords={[lang.label, lang.badge, ...(lang.aliases ?? [])]}
                            onSelect={() => {
                              const updates: Partial<CanvasElement> = { codeLanguage: lang.id };
                              if (isUntouchedDefaultCodeSnippet(element.text)) {
                                const nextSnippet = getDefaultCodeSnippet(lang.id);
                                const lineCount = Math.max(3, nextSnippet.split('\n').length);
                                const minH = 58 + lineCount * Math.round(currentFontSize * 1.55);
                                updates.text = nextSnippet;
                                updates.height = Math.max(164, minH);
                              }
                              onUpdateElement(element.id, updates);
                              setIsLanguageOpen(false);
                            }}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                          >
                            <Check
                              className={cn(
                                'size-3.5 shrink-0 transition-opacity duration-100',
                                isCurrent ? 'opacity-100 text-foreground' : 'opacity-0'
                              )}
                            />
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getCodeLanguageAccent(lang.id) }}
                            />
                            <span
                              className={cn(
                                'truncate',
                                isCurrent ? 'font-semibold text-foreground' : 'font-normal text-foreground/90'
                              )}
                            >
                              {lang.label}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </React.Fragment>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="w-px h-3.5 bg-border mx-0.5" />

        {/* Tamanho da fonte do código (mesmo padrão Select numérico da barra) */}
        <Select
          value={String(currentFontSize)}
          onValueChange={(val) => {
            const sz = parseInt(val, 10);
            if (!Number.isNaN(sz)) {
              const lineCount = Math.max(3, (element.text || '').split('\n').length);
              const minH = 58 + lineCount * Math.round(sz * 1.55);
              onUpdateElement(element.id, {
                fontSize: sz,
                height: Math.max(element.height || minH, minH),
              });
            }
          }}
          open={isCodeFontSelectOpen}
          onOpenChange={(open) => {
            setIsCodeFontSelectOpen(open);
            if (!open && typeof window !== 'undefined') {
              (window as unknown as Record<string, number>).__mirio_menu_dismissed_at = Date.now();
            }
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                aria-label="Tamanho da fonte do código"
                className="h-7 w-auto shrink-0 whitespace-nowrap gap-1 rounded-md border-none bg-transparent px-1.5 font-mono text-xs font-semibold text-foreground shadow-none hover:bg-muted focus:ring-1 focus:ring-ring focus:ring-offset-0 data-[state=open]:bg-muted cursor-pointer active:scale-[0.97] [&_svg]:size-2.5 [&_svg]:opacity-60"
              >
                <span className="tabular-nums leading-none">{currentFontSize}px</span>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Tamanho da fonte ({currentFontSize}px)</TooltipContent>
          </Tooltip>

          <SelectContent
            side="top"
            align="center"
            collisionPadding={12}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="w-24 rounded-xl border-border/80 shadow-xl"
          >
            <SelectGroup>
              {CODE_FONT_SIZES.map((sz) => (
                <SelectItem
                  key={sz}
                  value={String(sz)}
                  className="py-1 pl-7 pr-2 font-mono text-xs tabular-nums cursor-pointer rounded-md"
                >
                  {sz}px
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Alternador de tema Claro / Escuro do bloco de código */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() =>
                onUpdateElement(element.id, { codeTheme: isLight ? 'dark' : 'light' })
              }
              className="size-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
              aria-label={isLight ? 'Usar tema escuro no código' : 'Usar tema claro no código'}
            >
              {isLight ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isLight ? 'Tema escuro do editor' : 'Tema claro do editor'}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // 4. Controles de Mapa Mental (Mind Map)
  if (isMindMapNode(element) && onSpawnMindMapNode) {
    return (
      <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border">
        <button
          type="button"
          onClick={() => onSpawnMindMapNode(element.id, 'child')}
          className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Criar nó filho conectado (Tab)"
        >
          <GitBranch className="size-3 text-muted-foreground" />
          <span>+ Filho</span>
        </button>
        {element.mindmapParentId && (
          <button
            type="button"
            onClick={() => onSpawnMindMapNode(element.id, 'sibling')}
            className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
            title="Criar nó irmão (Enter)"
          >
            <Plus className="size-3 text-muted-foreground" />
            <span>Irmão</span>
          </button>
        )}
      </div>
    );
  }

  // 5. Controles de Recorte de Imagem (Sticker com imagem carregada)
  if (element.type === 'sticker' && element.src && onOpenCropModal) {
    return (
      <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border">
        <button
          type="button"
          onClick={() => onOpenCropModal(element.id)}
          className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1.5 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Recortar imagem"
        >
          <Crop className="size-3.5 text-muted-foreground" />
          <span>Recortar</span>
        </button>
      </div>
    );
  }

  // 6. Controles de Card de Link Rico (Embed)
  if (element.type === 'embed' && element.linkUrl) {
    return (
      <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-border">
        <button
          type="button"
          onClick={() => {
            const safe = normalizeUrl(element.linkUrl!);
            if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
          }}
          className="h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1.5 hover:bg-muted transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
          title="Abrir página original em nova aba"
        >
          <ExternalLink className="size-3.5 text-muted-foreground" />
          <span>Abrir Link</span>
        </button>
      </div>
    );
  }

  return null;
};
