export type StickyDirection = 'left' | 'right' | 'top' | 'bottom';

export interface StickyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Espaço vazio (em unidades do canvas) entre dois post-its encostados. */
export const STICKY_QUICK_ADD_GAP = 24;

/**
 * Calcula o retângulo do próximo post-it criado a partir dos botões
 * flutuantes de adição rápida, encostando-o ao lado escolhido.
 */
export function getAdjacentStickyRect(
  origin: StickyRect,
  direction: StickyDirection,
  gap: number = STICKY_QUICK_ADD_GAP
): StickyRect {
  const width = origin.width;
  const height = origin.height;

  switch (direction) {
    case 'left':
      return { x: origin.x - width - gap, y: origin.y, width, height };
    case 'right':
      return { x: origin.x + width + gap, y: origin.y, width, height };
    case 'top':
      return { x: origin.x, y: origin.y - height - gap, width, height };
    case 'bottom':
      return { x: origin.x, y: origin.y + height + gap, width, height };
  }
}
