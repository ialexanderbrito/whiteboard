export interface ViewportState {
  x: number;
  y: number;
  scale: number;
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
