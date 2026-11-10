import type { CanvasElement } from '../types/element.ts';
import { getElementWorldBounds, type WorldBounds } from './elementBounds.ts';

export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  /** Coordenada do eixo fixo (y para horizontal, x para vertical) */
  lineCoord: number;
  /** Coordenada inicial no outro eixo (min x para horizontal, min y para vertical) */
  start: number;
  /** Coordenada final no outro eixo (max x para horizontal, max y para vertical) */
  end: number;
}

export interface SmartGuideResult {
  /** Posição X corrigida da caixa delimitadora do elemento arrastado */
  snappedX: number;
  /** Posição Y corrigida da caixa delimitadora do elemento arrastado */
  snappedY: number;
  /** Deslocamento aplicado no eixo X */
  deltaX: number;
  /** Deslocamento aplicado no eixo Y */
  deltaY: number;
  /** Se houve encaixe magnético no eixo X */
  hasSnapX: boolean;
  /** Se houve encaixe magnético no eixo Y */
  hasSnapY: boolean;
  /** Linhas de guia visuais calculadas para renderização */
  guides: GuideLine[];
}

export interface CalculateSmartGuidesOptions {
  /** Caixa delimitadora no mundo do elemento ou grupo de elementos sendo movido */
  draggedBounds: WorldBounds;
  /** Elementos estáticos do quadro elegíveis para alinhamento */
  candidateElements: CanvasElement[];
  /** Tolerância de proximidade em coordenadas mundiais (ex: 8 / zoom) */
  tolerance: number;
  /** Se deve alinhar pelos centros geométricos */
  snapCenter?: boolean;
  /** Se deve alinhar pelas bordas (início e fim) */
  snapEdges?: boolean;
}

interface SnapCandidateX {
  diff: number;
  lineCoord: number;
  targetBounds: WorldBounds;
}

interface SnapCandidateY {
  diff: number;
  lineCoord: number;
  targetBounds: WorldBounds;
}

/**
 * Calcula o encaixe magnético (snapping) e as linhas-guia inteligentes
 * ao movimentar elementos no quadro, seguindo o padrão do Figma e Miro.
 */
export function calculateSmartGuidesAndSnap({
  draggedBounds,
  candidateElements,
  tolerance,
  snapCenter = true,
  snapEdges = true,
}: CalculateSmartGuidesOptions): SmartGuideResult {
  if (!candidateElements || candidateElements.length === 0 || tolerance <= 0) {
    return {
      snappedX: draggedBounds.x,
      snappedY: draggedBounds.y,
      deltaX: 0,
      deltaY: 0,
      hasSnapX: false,
      hasSnapY: false,
      guides: [],
    };
  }

  // Pontos de parada do elemento em movimento no eixo X
  const movingXStops: { coord: number; type: 'edge' | 'center' }[] = [];
  if (snapEdges) {
    movingXStops.push({ coord: draggedBounds.x, type: 'edge' }); // Esquerda
    movingXStops.push({ coord: draggedBounds.x + draggedBounds.w, type: 'edge' }); // Direita
  }
  if (snapCenter) {
    movingXStops.push({ coord: draggedBounds.x + draggedBounds.w / 2, type: 'center' }); // Centro horizontal
  }

  // Pontos de parada do elemento em movimento no eixo Y
  const movingYStops: { coord: number; type: 'edge' | 'center' }[] = [];
  if (snapEdges) {
    movingYStops.push({ coord: draggedBounds.y, type: 'edge' }); // Topo
    movingYStops.push({ coord: draggedBounds.y + draggedBounds.h, type: 'edge' }); // Base
  }
  if (snapCenter) {
    movingYStops.push({ coord: draggedBounds.y + draggedBounds.h / 2, type: 'center' }); // Centro vertical
  }

  // Extrai caixas delimitadoras mundiais dos candidatos
  const targets = candidateElements.map((el) => ({
    element: el,
    bounds: getElementWorldBounds(el),
  }));

  // --- 1. Encontra o melhor snap no eixo X (Linhas Verticais) ---
  let bestSnapX: SnapCandidateX | null = null;
  let minAbsDiffX = Infinity;

  for (const { bounds: tb } of targets) {
    const targetXStops: number[] = [];
    if (snapEdges) {
      targetXStops.push(tb.x); // Borda esquerda
      targetXStops.push(tb.x + tb.w); // Borda direita
    }
    if (snapCenter) {
      targetXStops.push(tb.x + tb.w / 2); // Centro horizontal
    }

    for (const moving of movingXStops) {
      for (const tX of targetXStops) {
        const diff = tX - moving.coord;
        const absDiff = Math.abs(diff);
        if (absDiff <= tolerance && absDiff < minAbsDiffX) {
          minAbsDiffX = absDiff;
          bestSnapX = {
            diff,
            lineCoord: tX,
            targetBounds: tb,
          };
        }
      }
    }
  }

  // --- 2. Encontra o melhor snap no eixo Y (Linhas Horizontais) ---
  let bestSnapY: SnapCandidateY | null = null;
  let minAbsDiffY = Infinity;

  for (const { bounds: tb } of targets) {
    const targetYStops: number[] = [];
    if (snapEdges) {
      targetYStops.push(tb.y); // Borda superior
      targetYStops.push(tb.y + tb.h); // Borda inferior
    }
    if (snapCenter) {
      targetYStops.push(tb.y + tb.h / 2); // Centro vertical
    }

    for (const moving of movingYStops) {
      for (const tY of targetYStops) {
        const diff = tY - moving.coord;
        const absDiff = Math.abs(diff);
        if (absDiff <= tolerance && absDiff < minAbsDiffY) {
          minAbsDiffY = absDiff;
          bestSnapY = {
            diff,
            lineCoord: tY,
            targetBounds: tb,
          };
        }
      }
    }
  }

  const deltaX = bestSnapX ? bestSnapX.diff : 0;
  const deltaY = bestSnapY ? bestSnapY.diff : 0;
  const snappedX = draggedBounds.x + deltaX;
  const snappedY = draggedBounds.y + deltaY;

  const guides: GuideLine[] = [];
  const padding = Math.max(12, tolerance * 1.5);

  // --- 3. Constrói a guia vertical (se alinhou no eixo X) ---
  if (bestSnapX) {
    const lineX = bestSnapX.lineCoord;
    // Bounding Y do elemento arrastado após aplicar o snap
    let minY = snappedY;
    let maxY = snappedY + draggedBounds.h;

    // Encontra todos os elementos que compartilham essa mesma linha X (dentro de margem fina)
    for (const { bounds: tb } of targets) {
      const stops = [tb.x, tb.x + tb.w / 2, tb.x + tb.w];
      const matches = stops.some((s) => Math.abs(s - lineX) < 0.5);
      if (matches) {
        minY = Math.min(minY, tb.y);
        maxY = Math.max(maxY, tb.y + tb.h);
      }
    }

    guides.push({
      orientation: 'vertical',
      lineCoord: lineX,
      start: minY - padding,
      end: maxY + padding,
    });
  }

  // --- 4. Constrói a guia horizontal (se alinhou no eixo Y) ---
  if (bestSnapY) {
    const lineY = bestSnapY.lineCoord;
    // Bounding X do elemento arrastado após aplicar o snap
    let minX = snappedX;
    let maxX = snappedX + draggedBounds.w;

    // Encontra todos os elementos que compartilham essa mesma linha Y
    for (const { bounds: tb } of targets) {
      const stops = [tb.y, tb.y + tb.h / 2, tb.y + tb.h];
      const matches = stops.some((s) => Math.abs(s - lineY) < 0.5);
      if (matches) {
        minX = Math.min(minX, tb.x);
        maxX = Math.max(maxX, tb.x + tb.w);
      }
    }

    guides.push({
      orientation: 'horizontal',
      lineCoord: lineY,
      start: minX - padding,
      end: maxX + padding,
    });
  }

  return {
    snappedX,
    snappedY,
    deltaX,
    deltaY,
    hasSnapX: bestSnapX !== null,
    hasSnapY: bestSnapY !== null,
    guides,
  };
}
