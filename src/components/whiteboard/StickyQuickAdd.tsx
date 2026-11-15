import React, { useLayoutEffect, useRef } from 'react';
import { Plus } from '@/components/ui/icons';
import type { CanvasElement } from '../../types/element';
import { getElementWorldBounds } from '../../utils/elementBounds';
import type { StickyDirection } from '../../utils/stickyPlacement';
import { getViewport, subscribeViewport, type ViewportState } from '../../utils/viewport';

interface StickyQuickAddProps {
  sticky: CanvasElement;
  onCreate: (direction: StickyDirection) => void;
  disabled?: boolean;
}

interface QuickAddDirection {
  direction: StickyDirection;
  label: string;
}

const DIRECTIONS: QuickAddDirection[] = [
  { direction: 'left', label: 'à esquerda' },
  { direction: 'right', label: 'à direita' },
  { direction: 'top', label: 'acima' },
  { direction: 'bottom', label: 'abaixo' },
];

/** Distância (em pixels de tela) entre a borda do elemento e o botão de adição. */
const QUICK_ADD_SCREEN_GAP = 20;
const QUICK_ADD_MIN_STICKY_SIZE = 40;

/**
 * Quatro botões "+" ao redor de um post-it ou forma geométrica selecionada.
 *
 * O posicionamento é escrito direto no DOM através do viewport compartilhado,
 * garantindo navegação a 60 FPS sem re-renderizar o canvas.
 */
export const StickyQuickAdd: React.FC<StickyQuickAddProps> = React.memo(({
  sticky,
  onCreate,
  disabled = false,
}) => {
  const buttonRefs = useRef<Partial<Record<StickyDirection, HTMLButtonElement | null>>>({});

  useLayoutEffect(() => {
    const place = (viewport: ViewportState) => {
      const bounds = getElementWorldBounds(sticky);
      const width = bounds.w * viewport.scale;
      const height = bounds.h * viewport.scale;
      const centerX = (bounds.x + bounds.w / 2) * viewport.scale + viewport.x;
      const centerY = (bounds.y + bounds.h / 2) * viewport.scale + viewport.y;

      const hideAll = () => {
        DIRECTIONS.forEach(({ direction }) => {
          const node = buttonRefs.current[direction];
          if (node) node.style.display = 'none';
        });
      };

      // Evita poluição visual em zooms muito afastados ou com o elemento fora da tela.
      if (Math.min(width, height) < QUICK_ADD_MIN_STICKY_SIZE) {
        hideAll();
        return;
      }

      const halfWidth = width / 2;
      const halfHeight = height / 2;
      const gap = QUICK_ADD_SCREEN_GAP;
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

      const positions: Record<StickyDirection, { x: number; y: number }> = {
        left: { x: centerX - halfWidth - gap, y: centerY },
        right: { x: centerX + halfWidth + gap, y: centerY },
        top: { x: centerX, y: centerY - halfHeight - gap },
        bottom: { x: centerX, y: centerY + halfHeight + gap },
      };

      DIRECTIONS.forEach(({ direction }) => {
        const node = buttonRefs.current[direction];
        if (!node) return;
        const position = positions[direction];
        // Perto do topo da tela a barra de propriedades é fixada em 68px; nesse
        // caso o botão de cima ficaria sobre ela, então o escondemos.
        const collidesWithToolbar = direction === 'top' && position.y < 120;
        const isVisible =
          !collidesWithToolbar &&
          position.x > -32 &&
          position.x < viewportWidth + 32 &&
          position.y > -32 &&
          position.y < viewportHeight + 32;

        node.style.display = isVisible ? 'flex' : 'none';
        node.style.left = `${position.x}px`;
        node.style.top = `${position.y}px`;
      });
    };

    place(getViewport());
    return subscribeViewport(place);
  }, [sticky]);

  const itemLabel = sticky.type === 'sticky' ? 'post-it' : 'forma';

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-visible select-none animate-in fade-in-0 duration-150">
      {DIRECTIONS.map(({ direction, label }) => (
        <button
          key={direction}
          ref={(node) => {
            buttonRefs.current[direction] = node;
          }}
          type="button"
          disabled={disabled}
          aria-label={`Adicionar ${itemLabel} ${label}`}
          title={`Adicionar ${itemLabel} ${label}`}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) onCreate(direction);
          }}
          className="pointer-events-auto absolute hidden size-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-background/95 dark:bg-card/95 text-muted-foreground shadow-xs backdrop-blur-xs transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-115 hover:border-foreground/50 hover:bg-background hover:text-foreground hover:shadow-xs active:scale-90 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-2.5" strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
});

StickyQuickAdd.displayName = 'StickyQuickAdd';
