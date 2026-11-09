export interface CursorReadout {
  x: number;
  y: number;
}

type CursorReadoutListener = (position: CursorReadout) => void;

let cursor: CursorReadout = { x: 0, y: 0 };
const listeners = new Set<CursorReadoutListener>();

/**
 * Lightweight channel for the toolbar coordinate readout.
 *
 * The mouse moves constantly while drawing/navigating; keeping this in React
 * state would re-render the whole board several times per second. Subscribers
 * write the value straight to the DOM instead.
 */
export function publishCursorReadout(next: CursorReadout) {
  if (cursor.x === next.x && cursor.y === next.y) return;
  cursor = next;
  listeners.forEach((listener) => listener(next));
}

export function getCursorReadout(): CursorReadout {
  return cursor;
}

export function subscribeCursorReadout(listener: CursorReadoutListener) {
  listeners.add(listener);
  listener(cursor);
  return () => {
    listeners.delete(listener);
  };
}
