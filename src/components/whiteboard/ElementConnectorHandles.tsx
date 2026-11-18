import React, { useLayoutEffect, useRef } from 'react';
import { ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from '@/components/ui/icons';
import type { CanvasElement, ConnectionSide } from '../../types/element';
import { getElementWorldBounds } from '../../utils/elementBounds';
import {
  getViewport,
  subscribeViewport,
  getElementDragOffset,
  subscribeElementDragOffset,
  resolveDraggedWorldBounds,
  isCoarseOrMobileViewport,
  type ViewportState,
} from '../../utils/viewport';
import { getCardinalAnchors } from '../../utils/connectors';

interface ElementConnectorHandlesProps {
  element: CanvasElement;
  onStartConnect: (
    elementId: string,
    side: ConnectionSide,
    startWorldPos: { x: number; y: number },
    e?: React.PointerEvent<HTMLButtonElement>
  ) => void;
  disabled?: boolean;
  selectionColor?: string;
}

const SIDES: {
  side: ConnectionSide;
  label: string;
  Icon: typeof ArrowUp;
}[] = [
  { side: 'top', label: 'Conectar acima', Icon: ArrowUp },
  { side: 'right', label: 'Conectar à direita', Icon: ArrowRight },
  { side: 'bottom', label: 'Conectar abaixo', Icon: ArrowDown },
  { side: 'left', label: 'Conectar à esquerda', Icon: ArrowLeft },
];

/**
 * 4 alças magnéticas circulares nas bordas do elemento selecionado (estilo Miro/FigJam).
 * Em repouso, exibem âncoras sutis na borda; ao aproximar o cursor, expandem suavemente
 * para um botão vibrante com a seta direcional para guiar o arraste de conexão com clareza.
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

      const drag = getElementDragOffset();
      const isDraggingThisElement = Boolean(drag?.active && drag.draggedIds.has(element.id));
      const bounds = resolveDraggedWorldBounds(element.id, getElementWorldBounds(element), drag);
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
          !isDraggingThisElement &&
          pos.x >= -20 &&
          pos.x <= viewportWidth + 20 &&
          pos.y >= -20 &&
          pos.y <= viewportHeight + 20;

        node.style.display = isVisible ? 'flex' : 'none';
        node.style.left = `${pos.x}px`;
        node.style.top = `${pos.y}px`;
      });

      if (containerRef.current) {
        containerRef.current.style.display = isDraggingThisElement ? 'none' : 'block';
      }
    };

    place(getViewport());
    const unsubViewport = subscribeViewport(place);
    const unsubDrag = subscribeElementDragOffset(() => place(getViewport()));
    return () => {
      unsubViewport();
      unsubDrag();
    };
  }, [element, disabled]);

  if (disabled || element.locked || isCoarseOrMobileViewport()) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-20 hidden [@media(pointer:fine)]:block select-none"
    >
      {SIDES.map(({ side, label, Icon }) => (
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
            onStartConnect(element.id, side, worldAnchor, e);
          }}
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group size-7 flex items-center justify-center rounded-full bg-transparent hover:scale-125 transition-transform duration-150 cursor-crosshair focus:outline-none focus-visible:opacity-100"
        >
          {/* Âncora com ponto magnético em repouso que se expande para botão de seta no hover */}
          <span
            className="relative flex items-center justify-center size-2.5 rounded-full bg-background border-2 shadow-xs transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:size-[22px] group-hover:border-background group-active:scale-95"
            style={{
              borderColor: selectionColor,
            }}
          >
            {/* Ponto central indicador de âncora */}
            <span
              className="block size-1 rounded-full transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-0 group-hover:opacity-0"
              style={{
                backgroundColor: selectionColor,
              }}
            />
            {/* Seta direcional que surge com clareza total no hover */}
            <span
              className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] text-white shadow-xs"
              style={{
                backgroundColor: selectionColor,
              }}
            >
              <Icon className="size-3 text-white pointer-events-none" strokeWidth={2.4} />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});

ElementConnectorHandles.displayName = 'ElementConnectorHandles';

