import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { subscribeViewport, type ViewportState } from '@/utils/viewport';

export type GridType = 'dots' | 'lines' | 'crosses' | 'hybrid' | 'isometric' | 'none';
export type GridSize = 'small' | 'medium' | 'large';

export interface CanvasGridProps {
  stagePos: { x: number; y: number };
  scale: number;
  gridType?: GridType;
  gridSize?: GridSize;
  gridOpacity?: number;
  showGrid?: boolean;
}

export const GRID_SIZE_VALUES: Record<GridSize, number> = {
  small: 24,
  medium: 40,
  large: 64,
};

export const DEFAULT_GRID_OPACITY = 0.55;

interface PatternDefinition {
  backgroundImage: string;
  backgroundSize: string;
  periodX: number;
  periodY: number;
}

function buildPatternDefinition(
  scale: number,
  gridType: GridType,
  gridSize: GridSize,
  isDark: boolean
): PatternDefinition {
  const baseSize = GRID_SIZE_VALUES[gridSize] || 40;
  const scaledSize = Math.max(12, baseSize * scale);
  const dotRadius = Math.max(1, Math.min(2.5, 1.25 * Math.sqrt(scale)));
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.13)';
  const lineColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)';
  const majorLineColor = isDark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(15, 23, 42, 0.09)';
  const crossColor = isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.16)';
  const isoColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)';

  if (gridType === 'dots') {
    return {
      backgroundImage: `radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px)`,
      backgroundSize: `${scaledSize}px ${scaledSize}px`,
      periodX: scaledSize,
      periodY: scaledSize,
    };
  }
  if (gridType === 'lines') {
    const majorStep = scaledSize * 4;
    return {
      backgroundImage: `
        linear-gradient(to right, ${lineColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${lineColor} 1px, transparent 1px),
        linear-gradient(to right, ${majorLineColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${majorLineColor} 1px, transparent 1px)
      `,
      backgroundSize: `
        ${scaledSize}px ${scaledSize}px,
        ${scaledSize}px ${scaledSize}px,
        ${majorStep}px ${majorStep}px,
        ${majorStep}px ${majorStep}px
      `,
      periodX: majorStep,
      periodY: majorStep,
    };
  }
  if (gridType === 'crosses') {
    const crossArm = Math.max(2.2, Math.min(4.5, 2.5 * Math.sqrt(scale)));
    const crossSvg = `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22${scaledSize}%22%20height%3D%22${scaledSize}%22%3E%3Cpath%20d%3D%22M%20${scaledSize / 2}%20${scaledSize / 2 - crossArm}%20v%20${crossArm * 2}%20M%20${scaledSize / 2 - crossArm}%20${scaledSize / 2}%20h%20${crossArm * 2}%22%20stroke%3D%22${encodeURIComponent(crossColor)}%22%20stroke-width%3D%221%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E`;
    return {
      backgroundImage: `url("${crossSvg}")`,
      backgroundSize: `${scaledSize}px ${scaledSize}px`,
      periodX: scaledSize,
      periodY: scaledSize,
    };
  }
  if (gridType === 'isometric') {
    const isoH = Math.round(scaledSize * 1.732);
    const isoSvg = `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22${scaledSize}%22%20height%3D%22${isoH}%22%3E%3Cpath%20d%3D%22M%200%20${isoH / 2}%20L%20${scaledSize}%200%20M%200%20${isoH / 2}%20L%20${scaledSize}%20${isoH}%20M%200%200%20V%20${isoH}%22%20stroke%3D%22${encodeURIComponent(isoColor)}%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E`;
    return {
      backgroundImage: `url("${isoSvg}")`,
      backgroundSize: `${scaledSize}px ${isoH}px`,
      periodX: scaledSize,
      periodY: isoH,
    };
  }
  const majorStep = scaledSize * 4;
  return {
    backgroundImage: `
      radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px),
      linear-gradient(to right, ${majorLineColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${majorLineColor} 1px, transparent 1px)
    `,
    backgroundSize: `
      ${scaledSize}px ${scaledSize}px,
      ${majorStep}px ${majorStep}px,
      ${majorStep}px ${majorStep}px
    `,
    periodX: majorStep,
    periodY: majorStep,
  };
}

function computePatternTransform(
  viewport: ViewportState,
  periodX: number,
  periodY: number
): string {
  const offsetX = ((viewport.x % periodX) + periodX) % periodX;
  const offsetY = ((viewport.y % periodY) + periodY) % periodY;
  return `translate3d(${offsetX}px, ${offsetY}px, 0)`;
}

export const CanvasGrid: React.FC<CanvasGridProps> = React.memo(({
  stagePos,
  scale,
  gridType = 'hybrid',
  gridSize = 'medium',
  gridOpacity = DEFAULT_GRID_OPACITY,
  showGrid = true,
}) => {
  const { isDark } = useTheme();
  const patternRef = useRef<HTMLDivElement>(null);
  const cachedDefRef = useRef<{ scale: number; def: PatternDefinition } | null>(null);

  // Fundo limpo sem marcas se estiver oculto ou se o tipo for 'none'
  const isHidden = !showGrid || gridType === 'none';
  const bgColor = isDark ? '#090d16' : '#f8fafc';

  // Hooks must run unconditionally, so the subscription lives before the
  // hidden early-return. Pure panning only updates GPU-composited translate3d,
  // avoiding full-screen CSS background-image/background-position repaints.
  useEffect(() => {
    cachedDefRef.current = null;
    return subscribeViewport((viewport) => {
      const node = patternRef.current;
      if (isHidden || !node) return;

      let current = cachedDefRef.current;
      if (!current || current.scale !== viewport.scale) {
        const def = buildPatternDefinition(viewport.scale, gridType, gridSize, isDark);
        current = { scale: viewport.scale, def };
        cachedDefRef.current = current;
        node.style.backgroundImage = def.backgroundImage;
        node.style.backgroundSize = def.backgroundSize;
        node.style.left = `-${def.periodX}px`;
        node.style.top = `-${def.periodY}px`;
        node.style.right = `-${def.periodX}px`;
        node.style.bottom = `-${def.periodY}px`;
      }

      node.style.transform = computePatternTransform(
        viewport,
        current.def.periodX,
        current.def.periodY
      );
    });
  }, [gridType, gridSize, isDark, isHidden]);

  const opacity = Math.max(
    0.1,
    Math.min(1.0, typeof gridOpacity === 'number' && !isNaN(gridOpacity) ? gridOpacity : DEFAULT_GRID_OPACITY)
  );

  if (isHidden) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: bgColor }}
      />
    );
  }

  const initialDef = buildPatternDefinition(scale, gridType, gridSize, isDark);
  const initialTransform = computePatternTransform(
    { x: stagePos.x, y: stagePos.y, scale },
    initialDef.periodX,
    initialDef.periodY
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div
        ref={patternRef}
        className="absolute pointer-events-none will-change-transform"
        style={{
          opacity,
          left: `-${initialDef.periodX}px`,
          top: `-${initialDef.periodY}px`,
          right: `-${initialDef.periodX}px`,
          bottom: `-${initialDef.periodY}px`,
          backgroundImage: initialDef.backgroundImage,
          backgroundSize: initialDef.backgroundSize,
          backgroundPosition: '0px 0px',
          transform: initialTransform,
        }}
      />
    </div>
  );
});

CanvasGrid.displayName = 'CanvasGrid';
