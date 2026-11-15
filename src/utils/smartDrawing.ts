/**
 * Utilitários de Smart Drawing (Desenho Inteligente) estilo Miro:
 * 1. Suavização de traços com redução de ruído (Ramer-Douglas-Peucker).
 * 2. Reconhecimento inteligente de formas geométricas (Círculo, Retângulo, Triângulo, Linha Reta e Seta).
 */

export interface Point2D {
  x: number;
  y: number;
}

export type DetectedShape =
  | { type: 'circle'; x: number; y: number; radius: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'triangle'; x: number; y: number; width: number; height: number }
  | { type: 'line'; points: [number, number, number, number] }
  | { type: 'arrow'; points: [number, number, number, number] }
  | { type: 'smoothed_pen'; points: number[] };

/**
 * Converte array plano [x1, y1, x2, y2, ...] em lista de Point2D
 */
export function flatToPoints(flat: number[]): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < flat.length - 1; i += 2) {
    points.push({ x: flat[i], y: flat[i + 1] });
  }
  return points;
}

/**
 * Converte lista de Point2D de volta para array plano
 */
export function pointsToFlat(pts: Point2D[]): number[] {
  const flat: number[] = [];
  for (const p of pts) {
    flat.push(Math.round(p.x), Math.round(p.y));
  }
  return flat;
}

/**
 * Distância euclidiana entre dois pontos
 */
function dist(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distância perpendicular de um ponto p a um segmento de reta de v a w
 */
function distToSegment(p: Point2D, v: Point2D, w: Point2D): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return dist(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y),
  });
}

/**
 * Algoritmo Ramer-Douglas-Peucker para simplificar pontos e eliminar ruído manual
 */
export function simplifyRDP(pts: Point2D[], epsilon: number): Point2D[] {
  if (pts.length <= 2) return pts;

  let dmax = 0;
  let index = 0;
  const end = pts.length - 1;

  for (let i = 1; i < end; i++) {
    const d = distToSegment(pts[i], pts[0], pts[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = simplifyRDP(pts.slice(0, index + 1), epsilon);
    const recResults2 = simplifyRDP(pts.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  }

  return [pts[0], pts[end]];
}

/**
 * Analisa o perfil radial e detecta picos locais (cantos / vértices) em relação ao centróide.
 */
function analyzeRadialProfile(
  pts: Point2D[],
  cx: number,
  cy: number
): { peaks: number; ratio: number } {
  const rads = pts.map((p) => dist(p, { x: cx, y: cy }));
  const n = rads.length;
  if (n < 8) return { peaks: 0, ratio: 1 };

  // Suavização por média móvel circular para filtrar micro-tremores de mouse/caneta
  const windowSize = Math.max(2, Math.floor(n * 0.06));
  const smoothed: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -windowSize; k <= windowSize; k++) {
      s += rads[(i + k + n) % n];
    }
    smoothed.push(s / (2 * windowSize + 1));
  }

  const avg = smoothed.reduce((a, b) => a + b, 0) / n;
  const minR = Math.min(...smoothed);
  const maxR = Math.max(...smoothed);
  const ratio = maxR / Math.max(1, minR);

  let peaks = 0;
  for (let i = 0; i < n; i++) {
    const prev = smoothed[(i - 1 + n) % n];
    const curr = smoothed[i];
    const next = smoothed[(i + 1) % n];
    if (curr > prev && curr > next && curr > avg * 1.04) {
      peaks++;
    }
  }

  return { peaks, ratio };
}

/**
 * Detecta se o desenho feito pelo usuário forma uma forma geométrica conhecida ou linha reta
 */
export function recognizeSmartShape(flatPoints: number[]): DetectedShape {
  const pts = flatToPoints(flatPoints);
  if (pts.length < 5) {
    return { type: 'smoothed_pen', points: flatPoints };
  }

  // 1. Calcula comprimento total do caminho percorrido
  let totalLength = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    totalLength += dist(pts[i], pts[i + 1]);
  }

  if (totalLength < 30) {
    return { type: 'smoothed_pen', points: flatPoints };
  }

  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  const startEndDist = dist(startPt, endPt);

  // Bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let sumX = 0;
  let sumY = 0;

  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    sumX += p.x;
    sumY += p.y;
  }

  const bbWidth = maxX - minX;
  const bbHeight = maxY - minY;
  const maxDim = Math.max(bbWidth, bbHeight);

  // 2. DETECÇÃO DE LINHA RETA OU SETA
  // Se a distância entre o início e o fim representa mais de 86% de todo o caminho percorrido
  if (startEndDist / totalLength > 0.86 && startEndDist > 40) {
    return {
      type: 'arrow',
      points: [
        Math.round(startPt.x),
        Math.round(startPt.y),
        Math.round(endPt.x),
        Math.round(endPt.y),
      ],
    };
  }

  // 3. DETECÇÃO DE FORMAS FECHADAS (Círculo, Triângulo e Retângulo)
  // Se a ponta final termina próxima do ponto inicial (loop fechado)
  const isClosedLoop = startEndDist < Math.max(45, maxDim * 0.40);

  if (isClosedLoop && maxDim > 30) {
    const cx = sumX / pts.length;
    const cy = sumY / pts.length;

    // Área do polígono pelo Teorema de Gauss (Shoelace Formula)
    let areaSum = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      areaSum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    const polygonArea = Math.abs(areaSum) / 2;
    const bbArea = Math.max(1, bbWidth * bbHeight);
    const areaRatio = polygonArea / bbArea;
    const aspectRatio = bbWidth / (bbHeight || 1);

    // Isoperimetric quotient (Circularity / Roundness): 4 * pi * Area / Perimeter^2
    // Para um círculo perfeito, circularity = 1.0; para um quadrado, circularity = pi/4 ~= 0.785
    const circularity =
      (4 * Math.PI * polygonArea) / Math.max(1, totalLength * totalLength);

    // Perfil radial e contagem de picos (cantos salientes)
    const { peaks, ratio: radialRatio } = analyzeRadialProfile(pts, cx, cy);

    // Alcance dos 4 cantos da Bounding Box:
    // Em um retângulo/quadrado, o traço desenhado passa muito próximo dos 4 cantos da caixa delimitadora.
    // Em um círculo, os 4 cantos da caixa delimitadora são geometricamente vazios (distância teórica ~= 0.207 * diâmetro).
    const corners: Point2D[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    const cornerDists = corners.map((c) => {
      let minD = Infinity;
      for (const p of pts) {
        const d = dist(p, c);
        if (d < minD) minD = d;
      }
      return minD / maxDim;
    });
    const avgCornerDist = cornerDists.reduce((a, b) => a + b, 0) / 4;
    const minCornerDist = Math.min(...cornerDists);
    const maxCornerDist = Math.max(...cornerDists);
    const cornersReached = cornerDists.filter((d) => d <= 0.16).length;

    // Simplificação RDP com tolerância adaptativa para contagem de vértices
    const simplified = simplifyRDP(pts, Math.max(8, maxDim * 0.08));
    const vertexCount = Math.max(0, simplified.length - 1);

    // 1. DETECÇÃO DE RETÂNGULO / QUADRADO (Avaliamos antes de círculo para evitar falsos círculos):
    // Critérios calibrados:
    // - Preenchimento substancial da bounding box (areaRatio >= 0.66)
    // - Presença de cantos bem definidos (avgCornerDist <= 0.13 ou cornersReached >= 3)
    // - Ou 4 vértices / 4 picos radiais detectados com alcance consistente aos cantos
    // - Circularidade estritamente menor que a de um círculo (circularity < 0.94)
    const isRectangular =
      (areaRatio >= 0.66 && (avgCornerDist <= 0.13 || (cornersReached >= 3 && maxCornerDist <= 0.22))) ||
      (areaRatio >= 0.70 && (vertexCount === 4 || peaks === 4) && avgCornerDist <= 0.15) ||
      (areaRatio >= 0.84 && avgCornerDist <= 0.15) ||
      (areaRatio >= 0.75 && radialRatio > 1.25 && avgCornerDist <= 0.16);

    if (isRectangular && circularity < 0.94) {
      // Se for quase perfeitamente quadrado (proporção próxima de 1:1), regulariza para lados iguais
      const isNearlySquare = Math.abs(bbWidth - bbHeight) / maxDim < 0.10;
      const finalWidth = isNearlySquare ? Math.max(bbWidth, bbHeight) : bbWidth;
      const finalHeight = isNearlySquare ? Math.max(bbWidth, bbHeight) : bbHeight;

      return {
        type: 'rect',
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(40, Math.round(finalWidth)),
        height: Math.max(40, Math.round(finalHeight)),
      };
    }

    // 2. DETECÇÃO DE TRIÂNGULO:
    // - Área compatível com triângulo (areaRatio < 0.64)
    // - 3 vértices / 3 picos radiais ou área triangular com no máximo 2 cantos atingidos
    if (
      areaRatio < 0.64 &&
      (vertexCount === 3 || peaks === 3 || (areaRatio <= 0.58 && cornersReached <= 2))
    ) {
      return {
        type: 'triangle',
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(40, Math.round(bbWidth)),
        height: Math.max(40, Math.round(bbHeight)),
      };
    }

    // 3. DETECÇÃO DE CÍRCULO:
    // Critérios rigorosamente calibrados contra falsos positivos:
    // - Aspect ratio equilibrado (0.72 a 1.38)
    // - Área proporcional ao círculo (pi/4 ~= 0.785, faixa 0.60 a 0.88)
    // - Variação radial suave (radialRatio <= 1.22)
    // - Alta circularidade isoperimétrica (circularity >= 0.80)
    // - Cantos da bounding box desocupados (avgCornerDist >= 0.14 e minCornerDist >= 0.05)
    // - Sem 4 cantos/picos de retângulo (peaks <= 2)
    if (
      aspectRatio >= 0.72 &&
      aspectRatio <= 1.38 &&
      areaRatio >= 0.60 &&
      areaRatio <= 0.88 &&
      radialRatio <= 1.22 &&
      circularity >= 0.80 &&
      avgCornerDist >= 0.14 &&
      minCornerDist >= 0.05 &&
      peaks <= 2
    ) {
      const radius = Math.round((bbWidth + bbHeight) / 4);
      return {
        type: 'circle',
        x: Math.round(cx),
        y: Math.round(cy),
        radius: Math.max(18, radius),
      };
    }
  }

  // 4. Se não for forma geométrica clássica, retorna o traço com suavização de ruído
  const smoothed = simplifyRDP(pts, 2.5);
  return {
    type: 'smoothed_pen',
    points: pointsToFlat(smoothed),
  };
}
