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

function buildPatternStyle(
  stagePos: ViewportState,
  scale: number,
  gridType: GridType,
  gridSize: GridSize,
  isDark: boolean
): React.CSSProperties {
  const baseSize = GRID_SIZE_VALUES[gridSize] || 40;
  const scaledSize = Math.max(12, baseSize * scale);
  const bgPosX = stagePos.x % scaledSize;
  const bgPosY = stagePos.y % scaledSize;
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
      backgroundPosition: `${bgPosX}px ${bgPosY}px`,
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
      backgroundPosition: `
        ${bgPosX}px ${bgPosY}px,
        ${bgPosX}px ${bgPosY}px,
        ${stagePos.x % majorStep}px ${stagePos.y % majorStep}px,
        ${stagePos.x % majorStep}px ${stagePos.y % majorStep}px
      `,
    };
  }
  if (gridType === 'crosses') {
    const crossArm = Math.max(2.2, Math.min(4.5, 2.5 * Math.sqrt(scale)));
    const crossSvg = `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22${scaledSize}%22%20height%3D%22${scaledSize}%22%3E%3Cpath%20d%3D%22M%20${scaledSize / 2}%20${scaledSize / 2 - crossArm}%20v%20${crossArm * 2}%20M%20${scaledSize / 2 - crossArm}%20${scaledSize / 2}%20h%20${crossArm * 2}%22%20stroke%3D%22${encodeURIComponent(crossColor)}%22%20stroke-width%3D%221%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E`;
    return {
      backgroundImage: `url("${crossSvg}")`,
      backgroundSize: `${scaledSize}px ${scaledSize}px`,
      backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    };
  }
  if (gridType === 'isometric') {
    const isoH = Math.round(scaledSize * 1.732);
    const isoSvg = `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22${scaledSize}%22%20height%3D%22${isoH}%22%3E%3Cpath%20d%3D%22M%200%20${isoH / 2}%20L%20${scaledSize}%200%20M%200%20${isoH / 2}%20L%20${scaledSize}%20${isoH}%20M%200%200%20V%20${isoH}%22%20stroke%3D%22${encodeURIComponent(isoColor)}%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E`;
    return {
      backgroundImage: `url("${isoSvg}")`,
      backgroundSize: `${scaledSize}px ${isoH}px`,
      backgroundPosition: `${stagePos.x % scaledSize}px ${stagePos.y % isoH}px`,
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
    backgroundPosition: `
      ${bgPosX}px ${bgPosY}px,
      ${stagePos.x % majorStep}px ${stagePos.y % majorStep}px,
      ${stagePos.x % majorStep}px ${stagePos.y % majorStep}px
    `,
  };
}

function applyPatternStyle(node: HTMLElement, style: React.CSSProperties) {
  node.style.backgroundImage = String(style.backgroundImage || '');
  node.style.backgroundSize = String(style.backgroundSize || '');
  node.style.backgroundPosition = String(style.backgroundPosition || '');
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

  // Fundo limpo sem marcas se estiver oculto ou se o tipo for 'none'
  const isHidden = !showGrid || gridType === 'none';
  const bgColor = isDark ? '#090d16' : '#f8fafc';

  // Hooks must run unconditionally, so the subscription lives before the
  // hidden early-return. This keeps pan/zoom updates out of React entirely.
  useEffect(() => {
    return subscribeViewport((viewport) => {
      if (isHidden || !patternRef.current) return;
      applyPatternStyle(
        patternRef.current,
        buildPatternStyle(viewport, viewport.scale, gridType, gridSize, isDark)
      );
    });
  }, [gridType, gridSize, isDark, isHidden]);

  const opacity = Math.max(
    0.1,
    Math.min(1.0, typeof gridOpacity === 'number' && !isNaN(gridOpacity) ? gridOpacity : DEFAULT_GRID_OPACITY)
  );

  const patternStyle = buildPatternStyle(
    { x: stagePos.x, y: stagePos.y, scale },
    scale,
    gridType,
    gridSize,
    isDark
  );

  if (isHidden) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: bgColor }}
      />
    );
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div
        ref={patternRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity,
          ...patternStyle,
        }}
      />
    </div>
  );
});

CanvasGrid.displayName = 'CanvasGrid';
