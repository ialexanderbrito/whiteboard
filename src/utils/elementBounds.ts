import type { CanvasElement } from '../types/element';
import type { ViewportState } from './viewport';

export interface WorldBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Normaliza um ângulo em graus para o intervalo (-180, 180], arredondado para inteiro
 * e garantindo que -0 vire 0 e -180 vire 180.
 */
export function normalizeRotationDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let normalized = ((Math.round(deg) + 180) % 360 + 360) % 360 - 180;
  if (normalized === -180) normalized = 180;
  return normalized === 0 ? 0 : normalized;
}

/**
 * Define quais elementos podem ser rotacionados pelas pontas da seleção.
 * Frames (Raias) permanecem ortogonais ao grid como no Miro/Figma.
 */
export function canElementRotate(el: Pick<CanvasElement, 'type' | 'locked'>): boolean {
  return el.type !== 'frame' && !el.locked;
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
  } else if (el.type === 'text') {
    const fontSize = el.fontSize || 20;
    const lineCount = Math.max(1, (el.text || '').split('\n').length);
    bounds = {
      x: el.x,
      y: el.y,
      w: el.width || 200,
      h: el.height || Math.round(fontSize * 1.2 * lineCount),
    };
  } else {
    bounds = {
      x: el.x,
      y: el.y,
      w: el.width || 120,
      h: el.height || 120,
    };
  }

  // Rotação: no Konva (e no overlay de GIF com transformOrigin 'top left'),
  // cada Group gira em torno da sua origem local (el.x, el.y) e o Transformer
  // translada (el.x, el.y) ao girar em torno do centro. Projetamos o centro
  // local (localCx, localCy) rotacionado a partir de (el.x, el.y) para obter
  // o AABB visual exato em coordenadas do mundo.
  const rot = el.rotation || 0;
  if (rot) {
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localCx = bounds.x - el.x + bounds.w / 2;
    const localCy = bounds.y - el.y + bounds.h / 2;
    const cx = el.x + localCx * cos - localCy * sin;
    const cy = el.y + localCx * sin + localCy * cos;
    const w = Math.abs(bounds.w * cos) + Math.abs(bounds.h * sin);
    const h = Math.abs(bounds.w * sin) + Math.abs(bounds.h * cos);
    bounds = { x: cx - w / 2, y: cy - h / 2, w, h };
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
