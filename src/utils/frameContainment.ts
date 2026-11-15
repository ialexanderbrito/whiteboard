import type { CanvasElement } from '../types/element';
import { getElementBounds } from './alignment.ts';

/**
 * Verifica se um elemento qualquer está geometricamente contido dentro de uma moldura (Frame).
 * Utiliza o ponto central do elemento delimitador (com uma tolerância de 4px nas bordas),
 * que é o padrão utilizado no Miro, Figma e FigJam para contenção fluida e intuitiva.
 */
export function isElementContainedInFrame(el: CanvasElement, frame: CanvasElement): boolean {
  if (!el || !frame || el.id === frame.id) return false;
  if (frame.type !== 'frame') return false;

  const frameWidth = frame.width || 420;
  const frameHeight = frame.height || 500;
  const frameLeft = frame.x;
  const frameTop = frame.y;
  const frameRight = frameLeft + frameWidth;
  const frameBottom = frameTop + frameHeight;

  const b = getElementBounds(el);

  // Considera contido se o centro do elemento estiver dentro do retângulo da moldura
  return (
    b.centerX >= frameLeft - 4 &&
    b.centerX <= frameRight + 4 &&
    b.centerY >= frameTop - 4 &&
    b.centerY <= frameBottom + 4
  );
}

/**
 * Retorna os IDs de todos os elementos contidos dentro da moldura especificada.
 */
export function getElementsContainedInFrame(
  frame: CanvasElement,
  allElements: CanvasElement[]
): string[] {
  if (!frame || frame.type !== 'frame' || !allElements || allElements.length === 0) {
    return [];
  }

  const containedIds: string[] = [];
  for (const el of allElements) {
    if (el.id !== frame.id && isElementContainedInFrame(el, frame)) {
      containedIds.push(el.id);
    }
  }
  return containedIds;
}
