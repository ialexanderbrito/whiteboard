import React, { useCallback, useMemo, useRef } from 'react';
import { X } from '@/components/ui/icons';
import type { CanvasElement } from '../../types/element';
import { getElementWorldBounds } from '../../utils/elementBounds';

interface BoardMinimapProps {
  open: boolean;
  elements: ReadonlyArray<CanvasElement>;
  stagePos: { x: number; y: number };
  scale: number;
  onNavigateToWorldPoint: (worldX: number, worldY: number) => void;
  onClose: () => void;
}

const MINIMAP_W = 196;
const MINIMAP_H = 128;

export const BoardMinimap: React.FC<BoardMinimapProps> = React.memo(({
  open,
  elements,
  stagePos,
  scale,
  onNavigateToWorldPoint,
  onClose,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);

  const viewportWorld = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    return {
      x: -stagePos.x / scale,
      y: -stagePos.y / scale,
      w: vw / scale,
      h: vh / scale,
    };
  }, [stagePos.x, stagePos.y, scale]);

  const worldBounds = useMemo(() => {
    let minX = viewportWorld.x;
    let minY = viewportWorld.y;
    let maxX = viewportWorld.x + viewportWorld.w;
    let maxY = viewportWorld.y + viewportWorld.h;

    for (const el of elements) {
      const b = getElementWorldBounds(el);
      if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    }

    const padX = Math.max(240, (maxX - minX) * 0.12);
    const padY = Math.max(180, (maxY - minY) * 0.12);
    minX -= padX;
    minY -= padY;
    maxX += padX;
    maxY += padY;

    let spanW = Math.max(800, maxX - minX);
    let spanH = Math.max(520, maxY - minY);
    const targetRatio = MINIMAP_W / MINIMAP_H;
    if (spanW / spanH > targetRatio) {
      const nextH = spanW / targetRatio;
      minY -= (nextH - spanH) / 2;
      spanH = nextH;
    } else {
      const nextW = spanH * targetRatio;
      minX -= (nextW - spanW) / 2;
      spanW = nextW;
    }

    return { x: minX, y: minY, w: spanW, h: spanH };
  }, [elements, viewportWorld]);

  const panToClientEvent = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const rx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ry = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const wx = worldBounds.x + rx * worldBounds.w;
      const wy = worldBounds.y + ry * worldBounds.h;
      onNavigateToWorldPoint(wx, wy);
    },
    [worldBounds, onNavigateToWorldPoint]
  );

  if (!open) return null;

  return (
    <div className="fixed bottom-14 right-3 z-30 origin-bottom-right bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-lg overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-border/60 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground/90">Minimapa</span>
          <span className="font-mono text-[9px] text-muted-foreground/80 tabular-nums">
            {Math.round(scale * 100)}%
          </span>
        </span>
        <button
          type="button"
          aria-label="Ocultar minimapa"
          onClick={onClose}
          className="size-4 rounded flex items-center justify-center hover:bg-muted hover:text-foreground transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.94] cursor-pointer"
          title="Ocultar minimapa (M)"
        >
          <X className="size-3" />
        </button>
      </div>

      <svg
        ref={svgRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        viewBox={`${worldBounds.x} ${worldBounds.y} ${worldBounds.w} ${worldBounds.h}`}
        className="block cursor-crosshair bg-muted/20"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          isDraggingRef.current = true;
          panToClientEvent(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!isDraggingRef.current) return;
          panToClientEvent(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          isDraggingRef.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
      >
        {elements.slice(0, 350).map((el) => {
          const b = getElementWorldBounds(el);
          if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
          const color =
            el.fill && el.fill !== 'transparent'
              ? el.fill
              : el.stroke && el.stroke !== 'transparent'
                ? el.stroke
                : el.type === 'code'
                  ? '#8b5cf6'
                  : el.type === 'kanban'
                    ? '#2563eb'
                    : el.type === 'table'
                      ? '#0ea5e9'
                      : el.type === 'comment'
                        ? el.commentAuthorColor || '#f59e0b'
                        : '#64748b';
          return (
            <rect
              key={el.id}
              x={b.x}
              y={b.y}
              width={Math.max(b.w, worldBounds.w * 0.012)}
              height={Math.max(b.h, worldBounds.h * 0.012)}
              rx={Math.min(12, b.w * 0.08)}
              fill={color}
              fillOpacity={el.type === 'frame' ? 0.16 : 0.78}
              stroke={el.type === 'frame' ? color : 'none'}
              strokeWidth={el.type === 'frame' ? worldBounds.w * 0.004 : 0}
            />
          );
        })}

        {/* Retângulo indicador da câmera atual */}
        <rect
          x={viewportWorld.x}
          y={viewportWorld.y}
          width={Math.max(viewportWorld.w, worldBounds.w * 0.03)}
          height={Math.max(viewportWorld.h, worldBounds.h * 0.03)}
          fill="currentColor"
          fillOpacity={0.07}
          stroke="currentColor"
          strokeWidth={worldBounds.w * 0.008}
          className="text-primary"
          rx={worldBounds.w * 0.008}
        />
      </svg>
    </div>
  );
});

BoardMinimap.displayName = 'BoardMinimap';
