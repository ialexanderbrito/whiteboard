import type { CanvasElement } from '../types/element';

export type AlignmentType =
  | 'left'
  | 'center-horizontal'
  | 'right'
  | 'top'
  | 'center-vertical'
  | 'bottom'
  | 'distribute-horizontal'
  | 'distribute-vertical';

export interface ElementBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface ElementAlignmentUpdate {
  id: string;
  updates: {
    x?: number;
    y?: number;
  };
}

/**
 * Calcula a caixa delimitadora (bounding box) exata de um elemento no plano mundial do canvas.
 */
export function getElementBounds(el: CanvasElement): ElementBounds {
  // Círculo: x e y representam o centro da forma
  if (el.type === 'circle') {
    const r = el.radius || (el.width ? el.width / 2 : 60);
    const left = el.x - r;
    const top = el.y - r;
    const width = r * 2;
    const height = r * 2;
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      centerX: el.x,
      centerY: el.y,
    };
  }

  // Traços de caneta, linhas ou setas
  if (
    (el.type === 'pen' || el.type === 'arrow' || el.type === 'line') &&
    el.points &&
    el.points.length >= 2
  ) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < el.points.length; i += 2) {
      xs.push(el.points[i]);
      if (i + 1 < el.points.length) {
        ys.push(el.points[i + 1]);
      }
    }
    const minPx = xs.length ? Math.min(...xs) : 0;
    const maxPx = xs.length ? Math.max(...xs) : 0;
    const minPy = ys.length ? Math.min(...ys) : 0;
    const maxPy = ys.length ? Math.max(...ys) : 0;

    const width = Math.max(10, maxPx - minPx);
    const height = Math.max(10, maxPy - minPy);
    const left = el.x + minPx;
    const top = el.y + minPy;

    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      centerX: left + width / 2,
      centerY: top + height / 2,
    };
  }

  // Retângulos, Post-its, Caixas de Texto, Molduras, Stickers, Gifs, Formas geométricas
  const defaultW = el.type === 'sticky' ? 180 : el.type === 'text' ? 200 : el.type === 'frame' ? 400 : 160;
  const defaultH = el.type === 'sticky' ? 180 : el.type === 'text' ? (el.fontSize ? el.fontSize * 1.5 : 30) : el.type === 'frame' ? 300 : 100;
  const w = el.width || defaultW;
  const h = el.height || defaultH;
  const left = el.x;
  const top = el.y;

  return {
    left,
    top,
    width: w,
    height: h,
    right: left + w,
    bottom: top + h,
    centerX: left + w / 2,
    centerY: top + h / 2,
  };
}

/**
 * Calcula as novas posições x e y necessárias para alinhar ou distribuir
 * os elementos selecionados de acordo com a operação solicitada.
 * Elementos bloqueados servem como âncoras na delimitação global, mas não são movidos.
 */
export function alignElements(
  elements: CanvasElement[],
  alignment: AlignmentType
): ElementAlignmentUpdate[] {
  if (!elements || elements.length < 2) return [];

  // Elementos elegíveis para movimentação
  const movable = elements.filter((el) => !el.locked);
  if (movable.length === 0) return [];

  // Bounding box global calculada a partir de todos os selecionados (incluindo bloqueados como âncora)
  const allBounds = elements.map((el) => ({
    element: el,
    bounds: getElementBounds(el),
  }));

  const minLeft = Math.min(...allBounds.map((b) => b.bounds.left));
  const maxRight = Math.max(...allBounds.map((b) => b.bounds.right));
  const minTop = Math.min(...allBounds.map((b) => b.bounds.top));
  const maxBottom = Math.max(...allBounds.map((b) => b.bounds.bottom));
  const groupCenterX = (minLeft + maxRight) / 2;
  const groupCenterY = (minTop + maxBottom) / 2;

  const updates: ElementAlignmentUpdate[] = [];

  switch (alignment) {
    case 'left': {
      for (const el of movable) {
        const b = getElementBounds(el);
        const deltaX = minLeft - b.left;
        if (Math.abs(deltaX) > 0.5) {
          updates.push({
            id: el.id,
            updates: { x: Math.round(el.x + deltaX) },
          });
        }
      }
      break;
    }

    case 'center-horizontal': {
      for (const el of movable) {
        const b = getElementBounds(el);
        const deltaX = groupCenterX - b.centerX;
        if (Math.abs(deltaX) > 0.5) {
          updates.push({
            id: el.id,
            updates: { x: Math.round(el.x + deltaX) },
          });
        }
      }
      break;
    }

    case 'right': {
      for (const el of movable) {
        const b = getElementBounds(el);
        const deltaX = maxRight - b.right;
        if (Math.abs(deltaX) > 0.5) {
          updates.push({
            id: el.id,
            updates: { x: Math.round(el.x + deltaX) },
          });
        }
      }
      break;
    }

    case 'top': {
      for (const el of movable) {
        const b = getElementBounds(el);
        const deltaY = minTop - b.top;
        if (Math.abs(deltaY) > 0.5) {
          updates.push({
            id: el.id,
            updates: { y: Math.round(el.y + deltaY) },
          });
        }
      }
      break;
    }

    case 'center-vertical': {
      for (const el of movable) {
        const b = getElementBounds(el);
        const deltaY = groupCenterY - b.centerY;
        if (Math.abs(deltaY) > 0.5) {
          updates.push({
            id: el.id,
            updates: { y: Math.round(el.y + deltaY) },
          });
        }
      }
      break;
    }

    case 'bottom': {
      for (const el of movable) {
        const b = getElementBounds(el);
        const deltaY = maxBottom - b.bottom;
        if (Math.abs(deltaY) > 0.5) {
          updates.push({
            id: el.id,
            updates: { y: Math.round(el.y + deltaY) },
          });
        }
      }
      break;
    }

    case 'distribute-horizontal': {
      if (elements.length < 3) return [];
      const sorted = [...allBounds].sort((a, b) => a.bounds.left - b.bounds.left);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidths = sorted.reduce((acc, curr) => acc + curr.bounds.width, 0);
      const availableSpace = (last.bounds.right - first.bounds.left) - totalWidths;

      if (availableSpace >= 0) {
        const gap = availableSpace / (sorted.length - 1);
        let currentLeft = first.bounds.left;
        for (let i = 0; i < sorted.length; i++) {
          const item = sorted[i];
          if (i > 0) {
            const targetLeft = currentLeft;
            const deltaX = targetLeft - item.bounds.left;
            if (!item.element.locked && Math.abs(deltaX) > 0.5) {
              updates.push({
                id: item.element.id,
                updates: { x: Math.round(item.element.x + deltaX) },
              });
            }
          }
          currentLeft += item.bounds.width + gap;
        }
      } else {
        const firstCenter = first.bounds.centerX;
        const lastCenter = last.bounds.centerX;
        const step = (lastCenter - firstCenter) / (sorted.length - 1);
        for (let i = 1; i < sorted.length - 1; i++) {
          const item = sorted[i];
          const targetCenterX = firstCenter + i * step;
          const deltaX = targetCenterX - item.bounds.centerX;
          if (!item.element.locked && Math.abs(deltaX) > 0.5) {
            updates.push({
              id: item.element.id,
              updates: { x: Math.round(item.element.x + deltaX) },
            });
          }
        }
      }
      break;
    }

    case 'distribute-vertical': {
      if (elements.length < 3) return [];
      const sorted = [...allBounds].sort((a, b) => a.bounds.top - b.bounds.top);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeights = sorted.reduce((acc, curr) => acc + curr.bounds.height, 0);
      const availableSpace = (last.bounds.bottom - first.bounds.top) - totalHeights;

      if (availableSpace >= 0) {
        const gap = availableSpace / (sorted.length - 1);
        let currentTop = first.bounds.top;
        for (let i = 0; i < sorted.length; i++) {
          const item = sorted[i];
          if (i > 0) {
            const targetTop = currentTop;
            const deltaY = targetTop - item.bounds.top;
            if (!item.element.locked && Math.abs(deltaY) > 0.5) {
              updates.push({
                id: item.element.id,
                updates: { y: Math.round(item.element.y + deltaY) },
              });
            }
          }
          currentTop += item.bounds.height + gap;
        }
      } else {
        const firstCenter = first.bounds.centerY;
        const lastCenter = last.bounds.centerY;
        const step = (lastCenter - firstCenter) / (sorted.length - 1);
        for (let i = 1; i < sorted.length - 1; i++) {
          const item = sorted[i];
          const targetCenterY = firstCenter + i * step;
          const deltaY = targetCenterY - item.bounds.centerY;
          if (!item.element.locked && Math.abs(deltaY) > 0.5) {
            updates.push({
              id: item.element.id,
              updates: { y: Math.round(item.element.y + deltaY) },
            });
          }
        }
      }
      break;
    }
  }

  return updates;
}
