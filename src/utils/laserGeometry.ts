export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
  /** Indica o início de um novo clique/traço para evitar linhas fantasmas entre cliques distintos */
  newStroke?: boolean;
  /** Cor hexadecimal opcional associada ao traço */
  color?: string;
}

export interface RibbonSample {
  x: number;
  y: number;
  nx: number;
  ny: number;
  /** Fator de espessura normalizado: 0 na ponta da cauda até 1 na cabeça ativa do feixe */
  taper: number;
}

export interface LaserOpticalPalette {
  hex: string;
  r: number;
  g: number;
  b: number;
  coronaRgb: string;
  contrastRimRgba: string;
}

export const DEFAULT_LASER_COLOR = '#ff1744';

export const LASER_COLOR_OPTIONS = [
  { name: 'Vermelho Rubi', value: '#ff1744' },
  { name: 'Verde Esmeralda', value: '#00c853' },
  { name: 'Azul Safira', value: '#2563eb' },
  { name: 'Ciano Elétrico', value: '#06b6d4' },
  { name: 'Roxo Ultravioleta', value: '#8b5cf6' },
  { name: 'Rosa Magenta', value: '#ec4899' },
  { name: 'Laranja Solar', value: '#f97316' },
  { name: 'Amarelo Ouro', value: '#eab308' },
] as const;

const HEX_6_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Normaliza e valida uma cor hexadecimal de 6 dígitos para o apontador laser.
 */
export function sanitizeLaserColor(color?: string | null): string {
  if (!color || typeof color !== 'string') return DEFAULT_LASER_COLOR;
  const trimmed = color.trim();
  if (HEX_6_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return DEFAULT_LASER_COLOR;
}

/**
 * Deriva as camadas ópticas (núcleo, corona incandescente e anel de contraste)
 * a partir de qualquer cor hexadecimal escolhida pelo usuário.
 */
export function getLaserOpticalPalette(color?: string | null): LaserOpticalPalette {
  const hex = sanitizeLaserColor(color);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Corona deslocada suavemente em direção ao branco para efeito de plasma luminoso
  const lift = luminance < 0.15 ? 0.42 : 0.28;
  const cr = Math.round(r + (255 - r) * lift);
  const cg = Math.round(g + (255 - g) * lift);
  const cb = Math.round(b + (255 - b) * lift);

  // Anel de contraste adaptativo para legibilidade tanto no claro quanto no escuro
  const contrastRimRgba =
    luminance > 0.8
      ? 'rgba(51, 65, 85, 0.34)'
      : luminance < 0.12
      ? 'rgba(255, 255, 255, 0.28)'
      : `rgba(${Math.round(r * 0.45)}, ${Math.round(g * 0.45)}, ${Math.round(b * 0.45)}, 0.24)`;

  return {
    hex,
    r,
    g,
    b,
    coronaRgb: `rgb(${cr}, ${cg}, ${cb})`,
    contrastRimRgba,
  };
}

/**
 * Separa o histórico bruto de pontos do laser em traços independentes,
 * descartando pontos expirados e removendo micro-tremores sem unir cliques distintos.
 */
export function splitLaserStrokes(
  rawPoints: readonly LaserPoint[],
  now: number,
  trailDurationMs: number,
  options?: {
    minDist?: number;
    maxGapMs?: number;
    liveTip?: { x: number; y: number } | null;
    isDrawing?: boolean;
    activeColor?: string;
  }
): LaserPoint[][] {
  const minDist = options?.minDist ?? 1.8;
  const maxGapMs = options?.maxGapMs ?? 280;
  const strokes: LaserPoint[][] = [];

  let currentStroke: LaserPoint[] = [];
  let forceBreak = false;

  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i];
    if (p.newStroke) {
      forceBreak = true;
    }

    if (now - p.timestamp > trailDurationMs) {
      continue;
    }

    if (currentStroke.length > 0) {
      const prev = currentStroke[currentStroke.length - 1];
      const timeGap = p.timestamp - prev.timestamp;
      if (forceBreak || timeGap > maxGapMs) {
        if (currentStroke.length >= 2) {
          strokes.push(currentStroke);
        }
        currentStroke = [p];
        forceBreak = false;
        continue;
      }

      if (Math.hypot(p.x - prev.x, p.y - prev.y) >= minDist) {
        currentStroke.push(p);
      }
    } else {
      currentStroke = [p];
      forceBreak = false;
    }
  }

  // Conecta suavemente o último ponto gravado à posição viva atual do ponteiro enquanto o botão está pressionado
  if (options?.isDrawing && options.liveTip && currentStroke.length > 0) {
    const last = currentStroke[currentStroke.length - 1];
    if (now - last.timestamp <= maxGapMs) {
      const distToTip = Math.hypot(options.liveTip.x - last.x, options.liveTip.y - last.y);
      if (distToTip >= 0.4) {
        currentStroke.push({
          x: options.liveTip.x,
          y: options.liveTip.y,
          timestamp: now,
          color: last.color ?? options.activeColor,
        });
      }
    }
  }

  if (currentStroke.length >= 2) {
    strokes.push(currentStroke);
  }

  return strokes;
}

/**
 * Suaviza polilinhas por subdivisão Chaikin (B-spline quadrática C1 sem overshoot),
 * preservando exatamente a origem da cauda e o centro exato do ponto focal na ponta.
 */
export function smoothLaserStroke(
  stroke: readonly LaserPoint[],
  minSubdivDist = 2.0,
  maxSamples = 180
): LaserPoint[] {
  if (stroke.length <= 2) {
    return stroke.slice();
  }

  const strokeColor = stroke[0].color;
  let pts: LaserPoint[] = stroke.slice();

  for (let pass = 0; pass < 2; pass++) {
    if (pts.length >= maxSamples) break;
    const next: LaserPoint[] = [pts[0]];

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);

      if (segLen < minSubdivDist) {
        if (i < pts.length - 2) {
          next.push(b);
        }
        continue;
      }

      const q: LaserPoint = {
        x: 0.75 * a.x + 0.25 * b.x,
        y: 0.75 * a.y + 0.25 * b.y,
        timestamp: 0.75 * a.timestamp + 0.25 * b.timestamp,
        color: strokeColor,
      };
      const r: LaserPoint = {
        x: 0.25 * a.x + 0.75 * b.x,
        y: 0.25 * a.y + 0.75 * b.y,
        timestamp: 0.25 * a.timestamp + 0.75 * b.timestamp,
        color: strokeColor,
      };
      next.push(q, r);
    }

    next.push(pts[pts.length - 1]);
    pts = next;
  }

  return pts;
}

/**
 * Gera amostras com normais contínuas suavizadas e perfil de afunilamento orgânico (taper)
 * para desenhar o feixe como uma fita vetorial única sem emendas nem rachaduras.
 */
export function computeRibbonSamples(
  smoothed: readonly LaserPoint[],
  now: number,
  trailDurationMs: number,
  tailFeatherWorldLen: number
): { samples: RibbonSample[]; headProgress: number } {
  const count = smoothed.length;
  if (count < 2) {
    return { samples: [], headProgress: 0 };
  }

  const arcLengths = new Float64Array(count);
  for (let i = 1; i < count; i++) {
    const dx = smoothed[i].x - smoothed[i - 1].x;
    const dy = smoothed[i].y - smoothed[i - 1].y;
    arcLengths[i] = arcLengths[i - 1] + Math.hypot(dx, dy);
  }

  const totalLength = arcLengths[count - 1];
  if (totalLength < 0.25) {
    return { samples: [], headProgress: 0 };
  }

  const rawNx = new Float64Array(count);
  const rawNy = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    const prev = smoothed[Math.max(0, i - 1)];
    const next = smoothed[Math.min(count - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len > 1e-4) {
      rawNx[i] = -dy / len;
      rawNy[i] = dx / len;
    } else if (i > 0) {
      rawNx[i] = rawNx[i - 1];
      rawNy[i] = rawNy[i - 1];
    } else {
      rawNx[i] = 0;
      rawNy[i] = 1;
    }
  }

  const featherDenom = Math.max(1e-3, Math.min(tailFeatherWorldLen, totalLength * 0.4));
  const headAge = Math.max(0, now - smoothed[count - 1].timestamp);
  const headProgress = Math.max(0, Math.min(1, 1 - headAge / trailDurationMs));

  const samples: RibbonSample[] = new Array(count);

  for (let i = 0; i < count; i++) {
    let nx = rawNx[i];
    let ny = rawNy[i];
    if (i > 0 && i < count - 1) {
      const bx = 0.25 * rawNx[i - 1] + 0.5 * rawNx[i] + 0.25 * rawNx[i + 1];
      const by = 0.25 * rawNy[i - 1] + 0.5 * rawNy[i] + 0.25 * rawNy[i + 1];
      const bLen = Math.hypot(bx, by);
      if (bLen > 1e-4) {
        nx = bx / bLen;
        ny = by / bLen;
      }
    }

    const age = Math.max(0, now - smoothed[i].timestamp);
    const timeLife = Math.max(0, Math.min(1, 1 - age / trailDurationMs));
    const tailFeather = i === 0 ? 0 : Math.min(1, arcLengths[i] / featherDenom);
    const taper = tailFeather * Math.pow(timeLife, 0.85);

    samples[i] = {
      x: smoothed[i].x,
      y: smoothed[i].y,
      nx,
      ny,
      taper,
    };
  }

  return { samples, headProgress };
}
