import type { CanvasElement, ConnectionSide, ConnectorStyle, ElementBinding } from '../types/element';
import { getElementWorldBounds, type WorldBounds } from './elementBounds.ts';

export interface AnchorPoint {
  x: number;
  y: number;
  side: ConnectionSide;
}

export interface ElementAnchors {
  top: { x: number; y: number };
  right: { x: number; y: number };
  bottom: { x: number; y: number };
  left: { x: number; y: number };
  center: { x: number; y: number };
}

/**
 * Retorna os 4 pontos cardeais de ancoragem (além do centro) para a bounding box do elemento.
 */
export function getCardinalAnchors(bounds: WorldBounds): ElementAnchors {
  return {
    top: { x: Math.round(bounds.x + bounds.w / 2), y: Math.round(bounds.y) },
    right: { x: Math.round(bounds.x + bounds.w), y: Math.round(bounds.y + bounds.h / 2) },
    bottom: { x: Math.round(bounds.x + bounds.w / 2), y: Math.round(bounds.y + bounds.h) },
    left: { x: Math.round(bounds.x), y: Math.round(bounds.y + bounds.h / 2) },
    center: { x: Math.round(bounds.x + bounds.w / 2), y: Math.round(bounds.y + bounds.h / 2) },
  };
}

/**
 * Obtém as âncoras no espaço global de coordenadas para qualquer elemento do canvas.
 */
export function getElementAnchors(el: CanvasElement): ElementAnchors {
  const bounds = getElementWorldBounds(el);
  return getCardinalAnchors(bounds);
}

/**
 * Determina o lado cardeal ótimo ('top', 'right', 'bottom', 'left') orientado para o ponto alvo.
 */
export function resolveAutoSide(sourceBounds: WorldBounds, targetPoint: { x: number; y: number }): ConnectionSide {
  const centerX = sourceBounds.x + sourceBounds.w / 2;
  const centerY = sourceBounds.y + sourceBounds.h / 2;
  const dx = targetPoint.x - centerX;
  const dy = targetPoint.y - centerY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  } else {
    return dy >= 0 ? 'bottom' : 'top';
  }
}

/**
 * Encontra a âncora cardeal mais próxima de um ponto específico dentro de um elemento.
 */
export function getClosestAnchor(
  point: { x: number; y: number },
  el: CanvasElement
): { side: ConnectionSide; point: { x: number; y: number }; distance: number } {
  const anchors = getElementAnchors(el);
  const candidates: { side: ConnectionSide; point: { x: number; y: number } }[] = [
    { side: 'top', point: anchors.top },
    { side: 'right', point: anchors.right },
    { side: 'bottom', point: anchors.bottom },
    { side: 'left', point: anchors.left },
  ];

  let best = candidates[0];
  let minDistance = Math.hypot(point.x - best.point.x, point.y - best.point.y);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const dist = Math.hypot(point.x - candidate.point.x, point.y - candidate.point.y);
    if (dist < minDistance) {
      minDistance = dist;
      best = candidate;
    }
  }

  return { side: best.side, point: best.point, distance: minDistance };
}

/**
 * Resolve as coordenadas globais de um vínculo de conector.
 */
export function resolveBindingPoint(
  binding: ElementBinding | undefined,
  elementMap: Map<string, CanvasElement>,
  otherPoint?: { x: number; y: number }
): { x: number; y: number; side: ConnectionSide } | null {
  if (!binding || !binding.elementId) return null;
  const targetElement = elementMap.get(binding.elementId);
  if (!targetElement) return null;

  const bounds = getElementWorldBounds(targetElement);
  const anchors = getCardinalAnchors(bounds);

  let side = binding.side || 'auto';
  if (side === 'auto') {
    side = otherPoint ? resolveAutoSide(bounds, otherPoint) : 'right';
  }

  const point = anchors[side as keyof ElementAnchors] || anchors.center;
  return { x: point.x, y: point.y, side };
}

/**
 * Calcula a rota de uma linha reta entre dois pontos.
 */
export function calculateStraightPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number[] {
  return [start.x, start.y, end.x, end.y];
}

/**
 * Calcula a rota de uma curva suave (Bezier) respeitando a orientação de saída/entrada dos nós.
 */
export function calculateCurvedPoints(
  start: { x: number; y: number },
  startSide: ConnectionSide,
  end: { x: number; y: number },
  endSide: ConnectionSide
): number[] {
  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  const curvature = Math.max(30, Math.min(dist * 0.45, 160));

  const getNormal = (side: ConnectionSide): { nx: number; ny: number } => {
    switch (side) {
      case 'top': return { nx: 0, ny: -1 };
      case 'bottom': return { nx: 0, ny: 1 };
      case 'left': return { nx: -1, ny: 0 };
      case 'right': return { nx: 1, ny: 0 };
      default: return { nx: 0, ny: 0 };
    }
  };

  const n1 = getNormal(startSide);
  const n2 = getNormal(endSide);

  const cp1 = {
    x: Math.round(start.x + n1.nx * curvature),
    y: Math.round(start.y + n1.ny * curvature),
  };
  const cp2 = {
    x: Math.round(end.x + n2.nx * curvature),
    y: Math.round(end.y + n2.ny * curvature),
  };

  return [start.x, start.y, cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y];
}

/**
 * Calcula a rota ortogonal (em degrau 90° estilo fluxograma/diagrama de arquitetura).
 */
export function calculateOrthogonalPoints(
  start: { x: number; y: number },
  startSide: ConnectionSide,
  end: { x: number; y: number },
  endSide: ConnectionSide
): number[] {
  const sx = start.x;
  const sy = start.y;
  const ex = end.x;
  const ey = end.y;

  const isStartHorizontal = startSide === 'left' || startSide === 'right';
  const isEndHorizontal = endSide === 'left' || endSide === 'right';

  // Se ambos saem/entram horizontalmente
  if (isStartHorizontal && isEndHorizontal) {
    const midX = Math.round((sx + ex) / 2);
    return [sx, sy, midX, sy, midX, ey, ex, ey];
  }

  // Se ambos saem/entram verticalmente
  if (!isStartHorizontal && !isEndHorizontal) {
    const midY = Math.round((sy + ey) / 2);
    return [sx, sy, sx, midY, ex, midY, ex, ey];
  }

  // Perpendicular (ex: sai horizontal e entra vertical)
  if (isStartHorizontal && !isEndHorizontal) {
    return [sx, sy, ex, sy, ex, ey];
  }

  // Sai vertical e entra horizontal
  return [sx, sy, sx, ey, ex, ey];
}

/**
 * Resolve a geometria completa dos pontos de um conector (Arrow ou Line),
 * calculando coordenadas globais e ajustando conforme o estilo ('straight', 'curved', 'orthogonal').
 */
export function resolveConnectorGeometry(
  element: CanvasElement,
  elementMap: Map<string, CanvasElement>
): {
  worldStart: { x: number; y: number };
  worldEnd: { x: number; y: number };
  routePoints: number[];
  startSide: ConnectionSide;
  endSide: ConnectionSide;
} {
  const points = element.points && element.points.length >= 4 ? element.points : [0, 0, 150, 100];
  const defaultStartX = element.x + points[0];
  const defaultStartY = element.y + points[1];
  const defaultEndX = element.x + points[points.length - 2];
  const defaultEndY = element.y + points[points.length - 1];

  let startResolved = resolveBindingPoint(element.startBinding, elementMap, { x: defaultEndX, y: defaultEndY });
  let endResolved = resolveBindingPoint(
    element.endBinding,
    elementMap,
    startResolved ? { x: startResolved.x, y: startResolved.y } : { x: defaultStartX, y: defaultStartY }
  );

  // Se a origem usava auto e o destino acabou de ser resolvido, recalcula o melhor lado da origem
  if (element.startBinding?.side === 'auto' && endResolved && startResolved) {
    const sourceEl = elementMap.get(element.startBinding.elementId);
    if (sourceEl) {
      startResolved = resolveBindingPoint(element.startBinding, elementMap, { x: endResolved.x, y: endResolved.y });
    }
  }

  const worldStart = startResolved
    ? { x: startResolved.x, y: startResolved.y }
    : { x: defaultStartX, y: defaultStartY };
  const worldEnd = endResolved
    ? { x: endResolved.x, y: endResolved.y }
    : { x: defaultEndX, y: defaultEndY };

  const startSide = startResolved ? startResolved.side : 'auto';
  const endSide = endResolved ? endResolved.side : 'auto';

  const style: ConnectorStyle = element.connectorStyle || 'straight';
  let routePoints: number[];

  if (style === 'curved') {
    routePoints = calculateCurvedPoints(worldStart, startSide, worldEnd, endSide);
  } else if (style === 'orthogonal') {
    routePoints = calculateOrthogonalPoints(worldStart, startSide, worldEnd, endSide);
  } else {
    routePoints = calculateStraightPoints(worldStart, worldEnd);
  }

  return {
    worldStart,
    worldEnd,
    routePoints,
    startSide,
    endSide,
  };
}

/**
 * Encontra a âncora mais próxima para snap magnético ao arrastar uma ponta de seta.
 */
export function findNearestSnapAnchor(
  point: { x: number; y: number },
  elements: CanvasElement[],
  threshold: number = 36,
  excludeId?: string
): {
  element: CanvasElement;
  side: ConnectionSide;
  anchorPoint: { x: number; y: number };
  distance: number;
} | null {
  let closest: {
    element: CanvasElement;
    side: ConnectionSide;
    anchorPoint: { x: number; y: number };
    distance: number;
  } | null = null;

  for (const el of elements) {
    if (el.id === excludeId || el.type === 'arrow' || el.type === 'line' || el.locked) continue;
    // Molduras não são nós de fluxo diagramáticos primários
    if (el.type === 'frame') continue;

    const bounds = getElementWorldBounds(el);
    // Verificação rápida de AABB expandida antes de calcular distâncias exatas
    if (
      point.x < bounds.x - threshold ||
      point.x > bounds.x + bounds.w + threshold ||
      point.y < bounds.y - threshold ||
      point.y > bounds.y + bounds.h + threshold
    ) {
      continue;
    }

    const { side, point: anchorPoint, distance } = getClosestAnchor(point, el);
    if (distance <= threshold && (!closest || distance < closest.distance)) {
      closest = {
        element: el,
        side,
        anchorPoint,
        distance,
      };
    }
  }

  return closest;
}

/**
 * Quando um ou mais elementos são movidos, recalcula e retorna as atualizações
 * necessárias para todas as setas e conectores que estão ancorados neles.
 */
export function getConnectedArrowUpdatesOnMove(
  movedElements: CanvasElement[],
  allElements: CanvasElement[]
): { id: string; updates: Partial<CanvasElement> }[] {
  const movedIds = new Set(movedElements.map((e) => e.id));
  const elementMap = new Map<string, CanvasElement>();
  
  // Preenche o mapa com a versão atualizada dos elementos movidos
  for (const el of allElements) {
    elementMap.set(el.id, el);
  }
  for (const moved of movedElements) {
    elementMap.set(moved.id, moved);
  }

  const arrowUpdates: { id: string; updates: Partial<CanvasElement> }[] = [];

  for (const el of allElements) {
    if (el.type !== 'arrow' && el.type !== 'line') continue;
    const startAttached = el.startBinding && movedIds.has(el.startBinding.elementId);
    const endAttached = el.endBinding && movedIds.has(el.endBinding.elementId);

    if (startAttached || endAttached) {
      const { worldStart, routePoints } = resolveConnectorGeometry(el, elementMap);

      // Normaliza para que element.x e element.y sejam a origem do conector (worldStart)
      // e os pontos fiquem relativos ao grupo Konva
      const relativePoints = routePoints.map((val, idx) =>
        idx % 2 === 0 ? Math.round(val - worldStart.x) : Math.round(val - worldStart.y)
      );

      arrowUpdates.push({
        id: el.id,
        updates: {
          x: Math.round(worldStart.x),
          y: Math.round(worldStart.y),
          points: relativePoints,
          updatedAt: Date.now(),
        },
      });
    }
  }

  return arrowUpdates;
}
