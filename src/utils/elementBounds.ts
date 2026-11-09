import type { CanvasElement } from '../types/element';
import type { ViewportState } from './viewport';

export interface WorldBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const boundsCache = new WeakMap<CanvasElement, WorldBounds>();

export function getElementWorldBounds(el: CanvasElement): WorldBounds {
  const cached = boundsCache.get(el);
  if (cached) return cached;

  let bounds: WorldBounds;

  if (el.type === 'circle') {
    const r = el.radius || (el.width ? el.width / 2 : 60);
    bounds = { x: el.x - r, y: el.y - r, w: r * 2, h: r * 2 };
  } else if (el.type === 'pen' && el.points && el.points.length >= 2) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < el.points.length; i += 2) {
      const px = el.points[i];
      const py = el.points[i + 1];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const pad = (el.strokeWidth || 4) / 2;
    bounds = {
      x: el.x + minX - pad,
      y: el.y + minY - pad,
      w: Math.max(10, maxX - minX) + pad * 2,
      h: Math.max(10, maxY - minY) + pad * 2,
    };
  } else if ((el.type === 'arrow' || el.type === 'line') && el.points && el.points.length >= 4) {
    const x1 = el.x + (el.points[0] || 0);
    const y1 = el.y + (el.points[1] || 0);
    const x2 = el.x + (el.points[2] || 0);
    const y2 = el.y + (el.points[3] || 0);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    bounds = {
      x: minX,
      y: minY,
      w: Math.max(10, Math.abs(x2 - x1)),
      h: Math.max(10, Math.abs(y2 - y1)),
    };
  } else {
    bounds = {
      x: el.x,
      y: el.y,
      w: el.width || 120,
      h: el.height || 120,
    };
  }

  boundsCache.set(el, bounds);
  return bounds;
}

export function boundsIntersect(a: WorldBounds, b: WorldBounds): boolean {
  return !(a.x > b.x + b.w || a.x + a.w < b.x || a.y > b.y + b.h || a.y + a.h < b.y);
}

export function isBoundsInViewport(
  bounds: WorldBounds,
  viewport: ViewportState,
  viewW: number,
  viewH: number,
  padding = 900
): boolean {
  const sx = bounds.x * viewport.scale + viewport.x;
  const sy = bounds.y * viewport.scale + viewport.y;
  const sw = bounds.w * viewport.scale;
  const sh = bounds.h * viewport.scale;
  return !(sx + sw < -padding || sx > viewW + padding || sy + sh < -padding || sy > viewH + padding);
}
