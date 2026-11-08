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
  // Se a distância entre o início e o fim representa mais de 90% de todo o caminho percorrido
  if (startEndDist / totalLength > 0.88 && startEndDist > 50) {
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
  const isClosedLoop = startEndDist < Math.max(45, maxDim * 0.35);

  if (isClosedLoop && maxDim > 35) {
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

    // Distâncias dos pontos ao centróide
    const rads = pts.map((p) => dist(p, { x: cx, y: cy }));
    const avgRadius = rads.reduce((a, b) => a + b, 0) / rads.length;
    const variance =
      rads.reduce((acc, r) => acc + (r - avgRadius) ** 2, 0) / rads.length;
    const stdDev = Math.sqrt(variance);
    const radialCoeff = stdDev / (avgRadius || 1);
    const aspectRatio = bbWidth / (bbHeight || 1);

    // Simplificação com epsilon moderado para contagem de vértices nítidos
    const simplified = simplifyRDP(pts, Math.max(14, maxDim * 0.09));
    const vertexCount = simplified.length - 1; // remove início/fim coincidente

    // A. CÍRCULO / BOLA:
    // Aspect ratio equilibrado (0.68 a 1.45)
    // Razão de área próxima da geometria teórica do círculo (pi/4 ~= 0.785)
    // Variação radial suave (radialCoeff <= 0.30)
    // NÃO possui 4 cantos retos como um retângulo
    if (
      aspectRatio >= 0.68 &&
      aspectRatio <= 1.45 &&
      areaRatio >= 0.58 &&
      areaRatio <= 0.86 &&
      radialCoeff <= 0.30
    ) {
      const radius = Math.round((bbWidth + bbHeight) / 4);
      return {
        type: 'circle',
        x: Math.round(cx),
        y: Math.round(cy),
        radius: Math.max(18, radius),
      };
    }

    // B. TRIÂNGULO:
    // Área nitidamente inferior (teórico = 0.50) e 3 vértices nítidos
    if (areaRatio < 0.62 && (vertexCount === 3 || areaRatio < 0.56)) {
      return {
        type: 'triangle',
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(40, Math.round(bbWidth)),
        height: Math.max(40, Math.round(bbHeight)),
      };
    }

    // C. RETÂNGULO / QUADRADO:
    // Preenchimento de quase toda a bounding box (área >= 0.85)
    // e 4 cantos nítidos
    if (areaRatio >= 0.85 && (vertexCount === 4 || areaRatio >= 0.90)) {
      return {
        type: 'rect',
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(40, Math.round(bbWidth)),
        height: Math.max(40, Math.round(bbHeight)),
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
