import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Layers, X, Frame, StickyNote, Square, Circle, Diamond, Triangle, Star, Type, ArrowRight, Minus, Pen, List, Smile, Play, MousePointerClick } from '@/components/ui/icons';
import type { CanvasElement, ElementType } from '../../types/element';
import { sortElementsByLayer, moveBlockInLayerOrder, getLayerLabel, supportsLayerReorder, type ElementZIndexUpdate } from '../../utils/layerOrder';

/**
 * Painel de Camadas (desktop)
 * ---------------------------
 * Lista todos os elementos em ordem de pilha (topo da lista = frente do canvas).
 * - Clique seleciona o elemento; Ctrl/Cmd+clique alterna seleção múltipla.
 * - Drag-and-drop reordena (multi-seleção move em bloco, preservando a ordem interna).
 * - A renormalização densa (1..n) é emitida como updates mínimos de zIndex.
 */

interface LayersPanelProps {
  elements: CanvasElement[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onReorder: (updates: ElementZIndexUpdate[]) => void;
  onClose: () => void;
  isReadOnly?: boolean;
  isCommentOnly?: boolean;
}

const TYPE_ICONS: Record<ElementType, React.ComponentType<{ className?: string }>> = {
  sticky: StickyNote,
  checklist: List,
  rect: Square,
  circle: Circle,
  diamond: Diamond,
  triangle: Triangle,
  star: Star,
  text: Type,
  arrow: ArrowRight,
  line: Minus,
  pen: Pen,
  frame: Frame,
  sticker: Smile,
  gif: Play,
};

const TYPE_LABELS: Partial<Record<ElementType, string>> = {
  sticky: 'Sticky',
  checklist: 'Checklist',
  rect: 'Retângulo',
  circle: 'Círculo',
  diamond: 'Losango',
  triangle: 'Triângulo',
  star: 'Estrela',
  text: 'Texto',
  arrow: 'Seta',
  line: 'Linha',
  pen: 'Traço',
  frame: 'Moldura',
  sticker: 'Sticker',
  gif: 'GIF',
};

// Amostra da cor de preenchimento do elemento para o chip do ícone
const typeFillMap: Partial<Record<ElementType, string>> = {
  sticky: '#fbbf24',
  checklist: '#38bdf8',
  frame: '#cbd5e1',
};

interface DragState {
  ids: string[];
  overId: string | null;
  position: 'before' | 'after';
}

export const LayersPanel: React.FC<LayersPanelProps> = React.memo(({
  elements,
  selectedIds,
  onSelectionChange,
  onReorder,
  onClose,
  isReadOnly = false,
  isCommentOnly = false,
}) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragIdsRef = useRef<string[]>([]);

  const canReorder = !isReadOnly && !isCommentOnly && elements.length > 0;

  // Frente da pilha primeiro (ordem visual do topo para o fundo)
  const ordered = useMemo(() => [...sortElementsByLayer(elements)].reverse(), [elements]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleRowClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.ctrlKey || e.metaKey) {
        const next = selectedSet.has(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id];
        onSelectionChange(next);
      } else if (!selectedSet.has(id) || selectedIds.length > 1) {
        onSelectionChange([id]);
      }
    },
    [selectedIds, selectedSet, onSelectionChange]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      if (!canReorder) {
        e.preventDefault();
        return;
      }
      // Bloco = seleção atual (se o item arrastado faz parte dela) ou o item sozinho.
      // Imagens/GIFs não participam da pilha: saem do bloco silenciosamente.
      const baseIds = selectedSet.has(id) && selectedIds.length > 0 ? [...selectedIds] : [id];
      const byId = new Map(elements.map((el) => [el.id, el]));
      const ids = baseIds.filter((sid) => {
        const el = byId.get(sid);
        return el ? supportsLayerReorder(el.type) : false;
      });
      if (ids.length === 0) {
        e.preventDefault();
        return;
      }
      dragIdsRef.current = ids;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ids.join(','));
      setDrag({ ids, overId: null, position: 'after' });
    },
    [canReorder, selectedSet, selectedIds, elements]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      if (!dragIdsRef.current.length) return;
      // Imagens/GIFs não são alvos de reordenação
      const target = elements.find((el) => el.id === id);
      if (!target || !supportsLayerReorder(target.type)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setDrag((prev) => (prev && prev.overId === id && prev.position === position ? prev : { ...prev!, overId: id, position }));
    },
    [elements]
  );

  const handleDragEnd = useCallback(() => {
    dragIdsRef.current = [];
    setDrag(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const ids = dragIdsRef.current;
      dragIdsRef.current = [];
      setDrag(null);
      if (!ids.length) return;

      // Imagens/GIFs não são alvos de reordenação
      const target = elements.find((el) => el.id === targetId);
      if (!target || !supportsLayerReorder(target.type)) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const position: 'before' | 'after' =
        e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

      // Alvo dentro do bloco arrastado: tratamos como soltar no vizinho mais próximo
      if (ids.includes(targetId)) return;

      const updates = moveBlockInLayerOrder(elements, ids, targetId, position);
      if (updates.length > 0) onReorder(updates);
    },
    [elements, onReorder]
  );

  return (
    <aside
      aria-label="Painel de Camadas"
      className="absolute right-4 top-16 bottom-16 z-40 w-72 flex flex-col rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide">Camadas</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {elements.length}
          </span>
        </div>
        <button
          type="button"
          aria-label="Fechar painel de camadas"
          onClick={onClose}
          className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 active:scale-[0.97] cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Dica de interação */}
      {canReorder && (
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[10px] text-muted-foreground/80">
          <MousePointerClick className="size-3 shrink-0" />
          <span>Ctrl+clique seleciona vários · arraste para reordenar</span>
        </div>
      )}
      {!canReorder && elements.length > 0 && (
        <div className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground/80">
          Visualização somente leitura
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 overscroll-contain">
        {ordered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-1.5">
            <Layers className="size-5 text-muted-foreground/50" />
            <p className="text-[11px] text-muted-foreground">
              Nenhum elemento no quadro ainda.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {ordered.map((el, idx) => {
              const Icon = TYPE_ICONS[el.type] || Square;
              const isSelected = selectedSet.has(el.id);
              const isOver = drag?.overId === el.id;
              const isDragged = drag?.ids.includes(el.id);
              const swatch = el.fill || typeFillMap[el.type];
              const insertLine =
                canReorder &&
                drag &&
                !isDragged &&
                isOver &&
                (drag.position === 'before' ? 'border-t-2 border-t-primary' : 'border-b-2 border-b-primary');

              return (
                <li
                  key={el.id}
                  draggable={canReorder && supportsLayerReorder(el.type)}
                  onDragStart={(e) => handleDragStart(e, el.id)}
                  onDragOver={(e) => handleDragOver(e, el.id)}
                  onDrop={(e) => handleDrop(e, el.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleRowClick(e, el.id)}
                  style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer select-none
                    transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none
                    animate-in fade-in slide-in-from-right-1 duration-150 fill-mode-backwards motion-reduce:animate-none
                    hover:bg-muted/70 active:scale-[0.995]
                    ${isSelected ? 'bg-muted ring-1 ring-foreground/25' : ''}
                    ${isOver ? insertLine ?? '' : ''}
                    ${isDragged ? 'opacity-40' : ''}`}
                  title={`${TYPE_LABELS[el.type] || 'Elemento'} · camada ${el.zIndex || 0}`}
                >
                  <span
                    className="size-6 shrink-0 rounded-md flex items-center justify-center border border-border/60"
                    style={swatch ? { backgroundColor: swatch } : { backgroundColor: 'hsl(var(--muted))' }}
                  >
                    <Icon
                      className={`size-3.5 ${
                        swatch ? 'text-white mix-blend-normal drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]' : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                  <span
                    className={`flex-1 min-w-0 truncate text-[11px] ${
                      isSelected ? 'font-medium' : 'text-foreground/85'
                    }`}
                  >
                    {getLayerLabel(el)}
                  </span>
                  {el.locked && (
                    <span className="text-[9px] text-muted-foreground shrink-0" aria-label="Trancado">
                      🔒
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-muted-foreground/60 tabular-nums shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {el.zIndex || 0}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
});

LayersPanel.displayName = 'LayersPanel';
