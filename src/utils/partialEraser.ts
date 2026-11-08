/**
 * Utilitário de Borracha Parcial (Segmentada / Gradual) estilo Miro:
 * Recorta e apaga partes de traços de caneta gradualmente, dividindo o traço
 * ou reduzindo suas pontas conforme o raio da borracha passa por cima.
 */

export interface Point2D {
  x: number;
  y: number;
}

export type PartialEraseResult =
  | { action: 'none' }
  | { action: 'delete' }
  | { action: 'update'; points: number[] }
  | { action: 'split'; firstPoints: number[]; extraStrokes: number[][] };

function dist(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simplificação rápida para não inflar a contagem de pontos após a interpolação
 */
function simplifyPoints(pts: Point2D[], minDistance: number = 2): Point2D[] {
  if (pts.length <= 2) return pts;
  const result: Point2D[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (dist(pts[i], result[result.length - 1]) >= minDistance) {
      result.push(pts[i]);
    }
  }
  // Garante que o último ponto é mantido
  if (result.length > 1 && result[result.length - 1] !== pts[pts.length - 1]) {
    result.push(pts[pts.length - 1]);
  }
  return result;
}

/**
 * Aplica a borracha com raio R em um elemento de caneta (type: 'pen')
 * @param flatPoints Array plano de coordenadas [x0, y0, x1, y1, ...]
 * @param elemOffset Posição { x, y } do elemento no canvas
 * @param eraserPos Posição { x, y } do centro da borracha no canvas
 * @param radius Raio da borracha em pixels mundiais
 */
export function eraseStrokePartially(
  flatPoints: number[],
  elemOffset: { x: number; y: number },
  eraserPos: { x: number; y: number },
  radius: number
): PartialEraseResult {
  if (!flatPoints || flatPoints.length < 4) {
    return { action: 'delete' };
  }

  // Converte pontos relativos para coordenadas mundiais
  const rawPts: Point2D[] = [];
  for (let i = 0; i < flatPoints.length - 1; i += 2) {
    rawPts.push({
      x: flatPoints[i] + elemOffset.x,
      y: flatPoints[i + 1] + elemOffset.y,
    });
  }

  // Verifica rapidamente se a bounding box do traço está próxima da borracha
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of rawPts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  // Se a borracha nem encosta na bounding box expandida pelo raio, nada mudou
  if (
    eraserPos.x + radius < minX ||
    eraserPos.x - radius > maxX ||
    eraserPos.y + radius < minY ||
    eraserPos.y - radius > maxY
  ) {
    return { action: 'none' };
  }

  // Interpolação fina para garantir que segmentos longos sejam cortados com precisão
  const interpolated: Point2D[] = [];
  const step = Math.max(3, Math.min(8, radius / 3));

  for (let i = 0; i < rawPts.length - 1; i++) {
    const p1 = rawPts[i];
    const p2 = rawPts[i + 1];
    const segmentLen = dist(p1, p2);
    interpolated.push(p1);

    if (segmentLen > step) {
      const numSteps = Math.floor(segmentLen / step);
      for (let s = 1; s <= numSteps; s++) {
        const t = s / (numSteps + 1);
        interpolated.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        });
      }
    }
  }
  interpolated.push(rawPts[rawPts.length - 1]);

  // Filtra os pontos que estão fora do raio da borracha em corridas contínuas (runs)
  const radiusSq = radius * radius;
  const runs: Point2D[][] = [];
  let currentRun: Point2D[] = [];
  let anyPointErased = false;

  for (const p of interpolated) {
    const dx = p.x - eraserPos.x;
    const dy = p.y - eraserPos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > radiusSq) {
      // Ponto fora da borracha: preserva
      currentRun.push(p);
    } else {
      // Ponto dentro da borracha: apagado
      anyPointErased = true;
      if (currentRun.length >= 2) {
        runs.push(currentRun);
      }
      currentRun = [];
    }
  }

  if (currentRun.length >= 2) {
    runs.push(currentRun);
  }

  // Se nenhum ponto foi apagado, não altera nada
  if (!anyPointErased) {
    return { action: 'none' };
  }

  // Se todos os pontos foram apagados pelo raio da borracha
  if (runs.length === 0) {
    return { action: 'delete' };
  }

  // Converte as corridas de volta para array plano relativo a elemOffset
  const validRunsFlat: number[][] = [];
  for (const run of runs) {
    const simplified = simplifyPoints(run, 2);
    if (simplified.length >= 2) {
      const flat: number[] = [];
      for (const p of simplified) {
        flat.push(Math.round(p.x - elemOffset.x), Math.round(p.y - elemOffset.y));
      }
      validRunsFlat.push(flat);
    }
  }

  if (validRunsFlat.length === 0) {
    return { action: 'delete' };
  }

  if (validRunsFlat.length === 1) {
    return {
      action: 'update',
      points: validRunsFlat[0],
    };
  }

  return {
    action: 'split',
    firstPoints: validRunsFlat[0],
    extraStrokes: validRunsFlat.slice(1),
  };
}
