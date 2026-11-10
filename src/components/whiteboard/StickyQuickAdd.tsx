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

/** Distância (em pixels de tela) entre a borda do post-it e o botão de adição. */
const QUICK_ADD_SCREEN_GAP = 24;
const QUICK_ADD_MIN_STICKY_SIZE = 48;

/**
 * Quatro botões "+" ao redor de um post-it selecionado, estilo FigJam.
 *
 * O posicionamento é escrito direto no DOM através do viewport compartilhado,
 * então pan/zoom não re-renderizam o board inteiro.
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

      // Evita poluição visual em zooms muito afastados ou com o post-it fora da tela.
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
          className="pointer-events-auto absolute hidden size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-popover/95 text-muted-foreground shadow-md backdrop-blur-md transition-[transform,background-color,color,border-color] duration-150 ease-out hover:scale-110 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
});

StickyQuickAdd.displayName = 'StickyQuickAdd';
