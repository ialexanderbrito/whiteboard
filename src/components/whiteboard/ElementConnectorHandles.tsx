import React, { useLayoutEffect, useRef } from 'react';
import type { CanvasElement, ConnectionSide } from '../../types/element';
import { getElementWorldBounds } from '../../utils/elementBounds';
import { getViewport, subscribeViewport, isCoarseOrMobileViewport, type ViewportState } from '../../utils/viewport';
import { getCardinalAnchors } from '../../utils/connectors';

interface ElementConnectorHandlesProps {
  element: CanvasElement;
  onStartConnect: (elementId: string, side: ConnectionSide, startWorldPos: { x: number; y: number }) => void;
  disabled?: boolean;
  selectionColor?: string;
}

const SIDES: { side: ConnectionSide; label: string }[] = [
  { side: 'top', label: 'Conectar acima' },
  { side: 'right', label: 'Conectar à direita' },
  { side: 'bottom', label: 'Conectar abaixo' },
  { side: 'left', label: 'Conectar à esquerda' },
];

/**
 * 4 alças magnéticas circulares nas bordas do elemento selecionado (estilo Miro/FigJam).
 * Ocultas por padrão (opacity-0) para manter o canvas limpo; surgem no hover ao aproximar
 * o cursor da borda e utilizam a cor de seleção do usuário para total coesão visual.
 */
export const ElementConnectorHandles: React.FC<ElementConnectorHandlesProps> = React.memo(({
  element,
  onStartConnect,
  disabled = false,
  selectionColor = '#0284c7',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRefs = useRef<Partial<Record<ConnectionSide, HTMLButtonElement | null>>>({});

  useLayoutEffect(() => {
    const place = (viewport: ViewportState) => {
      if (
        disabled ||
        element.locked ||
        element.type === 'arrow' ||
        element.type === 'line' ||
        element.type === 'frame' ||
        isCoarseOrMobileViewport()
      ) {
        if (containerRef.current) containerRef.current.style.display = 'none';
        return;
      }

      const bounds = getElementWorldBounds(element);
      const anchors = getCardinalAnchors(bounds);

      // Converte coordenadas do mundo para a tela
      const toScreen = (pt: { x: number; y: number }) => ({
        x: Math.round(pt.x * viewport.scale + viewport.x),
        y: Math.round(pt.y * viewport.scale + viewport.y),
      });

      const screenAnchors: Record<ConnectionSide, { x: number; y: number }> = {
        top: toScreen(anchors.top),
        right: toScreen(anchors.right),
        bottom: toScreen(anchors.bottom),
        left: toScreen(anchors.left),
        auto: toScreen(anchors.center),
      };

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

      SIDES.forEach(({ side }) => {
        const node = handleRefs.current[side];
        if (!node) return;
        const pos = screenAnchors[side];

        const isVisible =
          pos.x >= -20 &&
          pos.x <= viewportWidth + 20 &&
          pos.y >= -20 &&
          pos.y <= viewportHeight + 20;

        node.style.display = isVisible ? 'flex' : 'none';
        node.style.left = `${pos.x}px`;
        node.style.top = `${pos.y}px`;
      });

      if (containerRef.current) {
        containerRef.current.style.display = 'block';
      }
    };

    place(getViewport());
    return subscribeViewport(place);
  }, [element, disabled]);

  if (disabled || element.locked || isCoarseOrMobileViewport()) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-20 hidden [@media(pointer:fine)]:block select-none"
    >
      {SIDES.map(({ side, label }) => (
        <button
          key={side}
          ref={(node) => {
            handleRefs.current[side] = node;
          }}
          type="button"
          aria-label={label}
          title={label}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const bounds = getElementWorldBounds(element);
            const anchors = getCardinalAnchors(bounds);
            const worldAnchor = anchors[side as keyof typeof anchors] || anchors.center;
            onStartConnect(element.id, side, worldAnchor);
          }}
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group size-7 flex items-center justify-center rounded-full bg-transparent hover:scale-125 transition-transform duration-150 cursor-crosshair focus:outline-none focus-visible:opacity-100"
        >
          <span
            className="flex items-center justify-center size-3 rounded-full bg-popover border-2 shadow-xs transition-[transform,opacity,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-active:scale-90"
            style={{
              borderColor: selectionColor,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <span
              className="block size-1 rounded-full transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-125"
              style={{
                backgroundColor: selectionColor,
              }}
            />
          </span>
        </button>
      ))}
    </div>
  );
});

ElementConnectorHandles.displayName = 'ElementConnectorHandles';

