import { useCallback } from 'react';
import type { CanvasElement } from '../../types/element';
import {
  findNearestSnapAnchor,
  resolveConnectorGeometry,
} from '../../utils/connectors';

interface UseConnectorEndpointDragParams {
  elementsRef: React.RefObject<CanvasElement[]>;
  elementMap: Map<string, CanvasElement>;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  setSnapTargetAnchor: (anchor: { x: number; y: number } | null) => void;
}

/**
 * Hook modular dedicado à reconexão interativa das extremidades de setas e linhas
 * com snap magnético nas âncoras cardinais dos elementos próximos.
 */
export function useConnectorEndpointDrag({
  elementsRef,
  elementMap,
  onUpdateElement,
  setSnapTargetAnchor,
}: UseConnectorEndpointDragParams) {
  const handleArrowEndpointDragMove = useCallback(
    (_arrowId: string, _endpoint: 'start' | 'end', worldPos: { x: number; y: number }) => {
      const snap = findNearestSnapAnchor(worldPos, elementsRef.current || []);
      setSnapTargetAnchor(snap ? { x: snap.anchorPoint.x, y: snap.anchorPoint.y } : null);
    },
    [elementsRef, setSnapTargetAnchor]
  );

  const handleArrowEndpointDragEnd = useCallback(
    (arrowId: string, endpoint: 'start' | 'end', worldPos: { x: number; y: number }) => {
      setSnapTargetAnchor(null);
      const list = elementsRef.current || [];
      const arrow = list.find((el) => el.id === arrowId);
      if (!arrow || (arrow.type !== 'arrow' && arrow.type !== 'line')) return;

      const excludeId =
        endpoint === 'start' ? arrow.endBinding?.elementId : arrow.startBinding?.elementId;
      const snap = findNearestSnapAnchor(worldPos, list, 36, excludeId);

      const pts = arrow.points && arrow.points.length >= 4 ? arrow.points : [0, 0, 150, 100];
      const worldStart =
        endpoint === 'start'
          ? snap
            ? { x: snap.anchorPoint.x, y: snap.anchorPoint.y }
            : { x: Math.round(worldPos.x), y: Math.round(worldPos.y) }
          : { x: arrow.x + pts[0], y: arrow.y + pts[1] };
      const worldEnd =
        endpoint === 'end'
          ? snap
            ? { x: snap.anchorPoint.x, y: snap.anchorPoint.y }
            : { x: Math.round(worldPos.x), y: Math.round(worldPos.y) }
          : { x: arrow.x + pts[pts.length - 2], y: arrow.y + pts[pts.length - 1] };

      const nextStartBinding =
        endpoint === 'start'
          ? snap
            ? { elementId: snap.element.id, side: snap.side }
            : undefined
          : arrow.startBinding;
      const nextEndBinding =
        endpoint === 'end'
          ? snap
            ? { elementId: snap.element.id, side: snap.side }
            : undefined
          : arrow.endBinding;

      const candidateArrow: CanvasElement = {
        ...arrow,
        x: worldStart.x,
        y: worldStart.y,
        points: [0, 0, worldEnd.x - worldStart.x, worldEnd.y - worldStart.y],
        startBinding: nextStartBinding,
        endBinding: nextEndBinding,
      };

      const { worldStart: resolvedStart, routePoints } = resolveConnectorGeometry(
        candidateArrow,
        elementMap
      );
      const relativePoints = routePoints.map((val, idx) =>
        idx % 2 === 0 ? Math.round(val - resolvedStart.x) : Math.round(val - resolvedStart.y)
      );

      onUpdateElement(arrowId, {
        x: Math.round(resolvedStart.x),
        y: Math.round(resolvedStart.y),
        points: relativePoints,
        startBinding: nextStartBinding,
        endBinding: nextEndBinding,
      });
    },
    [elementsRef, elementMap, onUpdateElement, setSnapTargetAnchor]
  );

  return {
    handleArrowEndpointDragMove,
    handleArrowEndpointDragEnd,
  };
}
