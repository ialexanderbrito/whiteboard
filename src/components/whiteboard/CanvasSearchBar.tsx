import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronUp, ChevronDown, X } from '@/components/ui/icons';
import type { CanvasElement } from '../../types/element';

interface CanvasSearchBarProps {
  open: boolean;
  elements: ReadonlyArray<CanvasElement>;
  onClose: () => void;
  onFocusElement: (elementId: string) => void;
}

function getElementSearchableText(el: CanvasElement): string {
  const parts: string[] = [];
  if (el.text) parts.push(el.text);
  if (el.checklistTitle) parts.push(el.checklistTitle);
  if (Array.isArray(el.checklistItems)) {
    for (const item of el.checklistItems) {
      if (item?.text) parts.push(item.text);
    }
  }
  if (Array.isArray(el.richText)) {
    for (const run of el.richText) {
      if (run?.text) parts.push(run.text);
    }
  }
  if (el.alt) parts.push(el.alt);
  return parts.join(' ').toLowerCase();
}

export const CanvasSearchBar: React.FC<CanvasSearchBarProps> = ({
  open,
  elements,
  onClose,
  onFocusElement,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    }
  }, [open]);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return elements.filter((el) => getElementSearchableText(el).includes(trimmed));
  }, [elements, query]);

  const safeIndex = matches.length > 0 ? activeIndex % matches.length : 0;

  const navigateMatch = (delta: number) => {
    if (matches.length === 0) return;
    const nextIdx = (safeIndex + delta + matches.length) % matches.length;
    setActiveIndex(nextIdx);
    onFocusElement(matches[nextIdx].id);
  };

  if (!open) return null;

  return (
    <div className="fixed top-16 right-4 z-40 flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-xl px-2.5 py-1.5 animate-in fade-in zoom-in-95 duration-150">
      <Search className="size-3.5 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          const trimmed = e.target.value.trim().toLowerCase();
          if (trimmed) {
            const first = elements.find((el) => getElementSearchableText(el).includes(trimmed));
            if (first) onFocusElement(first.id);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            navigateMatch(e.shiftKey ? -1 : 1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateMatch(1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateMatch(-1);
          }
        }}
        placeholder="Buscar texto no quadro..."
        className="w-44 sm:w-52 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
      />

      <span className="text-[10px] font-mono tabular-nums text-muted-foreground px-1 select-none min-w-[36px] text-right">
        {query.trim() ? (matches.length > 0 ? `${safeIndex + 1}/${matches.length}` : '0/0') : ''}
      </span>

      <div className="h-3.5 w-px bg-border/70" />

      <button
        type="button"
        onClick={() => navigateMatch(-1)}
        disabled={matches.length === 0}
        className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer active:scale-[0.96]"
        title="Anterior (Shift+Enter)"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => navigateMatch(1)}
        disabled={matches.length === 0}
        className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer active:scale-[0.96]"
        title="Próximo (Enter)"
      >
        <ChevronDown className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer active:scale-[0.96]"
        title="Fechar busca (Esc)"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};
