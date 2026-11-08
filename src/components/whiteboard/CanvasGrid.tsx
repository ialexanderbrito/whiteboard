import React from 'react';
import { useTheme } from '@/context/ThemeContext';

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

export const CanvasGrid: React.FC<CanvasGridProps> = React.memo(({
  stagePos,
  scale,
  gridType = 'hybrid',
  gridSize = 'medium',
  gridOpacity = DEFAULT_GRID_OPACITY,
  showGrid = true,
}) => {
  const { isDark } = useTheme();

  // Fundo limpo sem marcas se estiver oculto ou se o tipo for 'none'
  const isHidden = !showGrid || gridType === 'none';
  const bgColor = isDark ? '#090d16' : '#f8fafc';

  if (isHidden) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: bgColor }}
      />
    );
  }

  // Clampar a opacidade ajustável entre 0.1 e 1.0 (padrão suave e confortável)
  const opacity = Math.max(
    0.1,
    Math.min(1.0, typeof gridOpacity === 'number' && !isNaN(gridOpacity) ? gridOpacity : DEFAULT_GRID_OPACITY)
  );

  // Tamanho base da grade em coordenadas mundiais escaladas pela lente da câmera
  const baseSize = GRID_SIZE_VALUES[gridSize] || 40;
  const scaledSize = Math.max(12, baseSize * scale);

  // Cores calibradas para conforto visual: suaves, elegantes e sem competir com os elementos desenhados
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.13)';
  const lineColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)';
  const majorLineColor = isDark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(15, 23, 42, 0.09)';
  const crossColor = isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.16)';
  const isoColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)';

  // Alinhamento do fundo com as coordenadas de câmera
  const bgPosX = stagePos.x % scaledSize;
  const bgPosY = stagePos.y % scaledSize;

  // Tamanho do ponto do grid proporcional ao zoom
  const dotRadius = Math.max(1, Math.min(2.5, 1.25 * Math.sqrt(scale)));

  let patternStyle: React.CSSProperties = {};

  // 1. Grade de Pontos (Dots - estilo FigJam / Miro clássico)
  if (gridType === 'dots') {
    patternStyle = {
      backgroundImage: `radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px)`,
      backgroundSize: `${scaledSize}px ${scaledSize}px`,
      backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    };
  } else if (gridType === 'lines') {
    // 2. Grade Quadriculada (Lines - papel milimetrado / technical grid)
    const majorStep = scaledSize * 4;
    patternStyle = {
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
  } else if (gridType === 'crosses') {
    // 3. Grade de Cruzes / Retículo (Crosses - estilo Figma / Blueprint / CAD)
    const crossArm = Math.max(2.2, Math.min(4.5, 2.5 * Math.sqrt(scale)));
    const crossSvg = `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22${scaledSize}%22%20height%3D%22${scaledSize}%22%3E%3Cpath%20d%3D%22M%20${scaledSize / 2}%20${scaledSize / 2 - crossArm}%20v%20${crossArm * 2}%20M%20${scaledSize / 2 - crossArm}%20${scaledSize / 2}%20h%20${crossArm * 2}%22%20stroke%3D%22${encodeURIComponent(crossColor)}%22%20stroke-width%3D%221%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E`;
    patternStyle = {
      backgroundImage: `url("${crossSvg}")`,
      backgroundSize: `${scaledSize}px ${scaledSize}px`,
      backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    };
  } else if (gridType === 'isometric') {
    // 4. Grade Isométrica (Isometric - perspectiva triangular 3D para arquitetura e diagramas)
    const isoH = Math.round(scaledSize * 1.732); // sqrt(3)
    const isoSvg = `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22${scaledSize}%22%20height%3D%22${isoH}%22%3E%3Cpath%20d%3D%22M%200%20${isoH / 2}%20L%20${scaledSize}%200%20M%200%20${isoH / 2}%20L%20${scaledSize}%20${isoH}%20M%200%200%20V%20${isoH}%22%20stroke%3D%22${encodeURIComponent(isoColor)}%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E`;
    patternStyle = {
      backgroundImage: `url("${isoSvg}")`,
      backgroundSize: `${scaledSize}px ${isoH}px`,
      backgroundPosition: `${stagePos.x % scaledSize}px ${stagePos.y % isoH}px`,
    };
  } else {
    // 5. Padrão: Híbrido (Dots + Linhas Maiores a cada 4 unidades)
    const majorStep = scaledSize * 4;
    patternStyle = {
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

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div
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
