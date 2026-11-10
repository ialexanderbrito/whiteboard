import type { WorldBounds } from './elementBounds';

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface TouchVelocity {
  vx: number;
  vy: number;
}

export interface InertialStepResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

type ViewportListener = (viewport: ViewportState) => void;

let viewport: ViewportState = { x: 0, y: 0, scale: 1 };
const listeners = new Set<ViewportListener>();

export function getViewport(): ViewportState {
  return viewport;
}

export function publishViewport(next: ViewportState) {
  if (viewport.x === next.x && viewport.y === next.y && viewport.scale === next.scale) {
    return;
  }
  viewport = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeViewport(listener: ViewportListener) {
  listeners.add(listener);
  listener(viewport);
  return () => {
    listeners.delete(listener);
  };
}

export function applyWorldTransform(
  node: HTMLElement | null,
  next: ViewportState = viewport
) {
  if (!node) return;
  node.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
}

/**
 * Detecta se o dispositivo atual é mobile ou baseado em toque (coarse pointer).
 * Usado para desativar filtros caros de canvas 2D (shadowBlur) e limitar pixelRatio.
 */
export function isCoarseOrMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
}

/**
 * Suaviza a velocidade instantânea do dedo (em px/ms) usando média móvel exponencial
 * e limita picos espúrios de digitalizadores touch de alta frequência.
 */
export function blendTouchVelocity(
  prev: TouchVelocity,
  dx: number,
  dy: number,
  dtMs: number,
  maxSpeed = 3.5
): TouchVelocity {
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return prev;
  }
  const instantVx = dx / dtMs;
  const instantVy = dy / dtMs;
  const isInitial = prev.vx === 0 && prev.vy === 0;
  let vx = isInitial ? instantVx : prev.vx * 0.35 + instantVx * 0.65;
  let vy = isInitial ? instantVy : prev.vy * 0.35 + instantVy * 0.65;

  const speed = Math.hypot(vx, vy);
  if (speed > maxSpeed && speed > 0) {
    const ratio = maxSpeed / speed;
    vx *= ratio;
    vy *= ratio;
  }
  return { vx, vy };
}

/**
 * Calcula um passo de deslize inercial (momentum scrolling) independente da taxa de quadros (60/120Hz).
 */
export function stepInertialPan(
  pos: { x: number; y: number },
  velocity: TouchVelocity,
  dtMs: number,
  frictionPer16ms = 0.92,
  stopSpeedPxPerMs = 0.015
): InertialStepResult {
  const clampedDt = Math.max(1, Math.min(34, Number.isFinite(dtMs) ? dtMs : 16.67));
  const decay = Math.pow(frictionPer16ms, clampedDt / 16.67);
  const nextVx = velocity.vx * decay;
  const nextVy = velocity.vy * decay;
  const speed = Math.hypot(nextVx, nextVy);

  if (speed < stopSpeedPxPerMs) {
    return {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      vx: 0,
      vy: 0,
      active: false,
    };
  }

  return {
    x: pos.x + nextVx * clampedDt,
    y: pos.y + nextVy * clampedDt,
    vx: nextVx,
    vy: nextVy,
    active: true,
  };
}

/**
 * Calcula o novo viewport (x, y, scale) durante o gesto de pinça de 2 dedos,
 * mantendo fixo o ponto do mundo sob o centro inicial da pinça.
 */
export function computePinchViewport(
  centerWorld: { x: number; y: number },
  startDist: number,
  startScale: number,
  currentCenter: { x: number; y: number },
  currentDist: number,
  minScale = 0.1,
  maxScale = 5
): ViewportState {
  const safeStartDist = Math.max(1, startDist);
  const safeCurrentDist = Math.max(1, currentDist);
  const rawScale = startScale * (safeCurrentDist / safeStartDist);
  const scale = Math.max(minScale, Math.min(maxScale, rawScale));
  return {
    x: currentCenter.x - centerWorld.x * scale,
    y: currentCenter.y - centerWorld.y * scale,
    scale,
  };
}

/**
 * Calcula a posição e escala ideais para enquadrar todos os elementos do quadro na tela.
 */
export function computeFitToContentViewport(
  boundsList: WorldBounds[],
  viewWidth: number,
  viewHeight: number,
  options?: {
    padding?: number;
    topInset?: number;
    minScale?: number;
    maxScale?: number;
  }
): ViewportState | null {
  if (!boundsList || boundsList.length === 0 || viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  const padding = options?.padding ?? 32;
  const topInset = options?.topInset ?? 0;
  const minScale = options?.minScale ?? 0.15;
  const maxScale = options?.maxScale ?? 1.0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < boundsList.length; i++) {
    const b = boundsList[i];
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null;
  }

  const contentW = Math.max(160, maxX - minX);
  const contentH = Math.max(160, maxY - minY);
  const availW = Math.max(100, viewWidth - padding * 2);
  const availH = Math.max(100, viewHeight - topInset - padding * 2);

  const rawScale = Math.min(availW / contentW, availH / contentH);
  const scale = Math.max(minScale, Math.min(maxScale, rawScale));

  const x = Math.round((viewWidth - contentW * scale) / 2 - minX * scale);
  const y = Math.round(topInset + (viewHeight - topInset - contentH * scale) / 2 - minY * scale);

  return { x, y, scale };
}

