import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, ArrowUpRight, Layers } from '@/components/ui/icons';
import type { Board } from '@/types/board';
import type { CanvasElement } from '@/types/element';
import { elementService } from '@/services/elementService';
import { getElementWorldBounds } from '@/utils/elementBounds';

interface BoardCardPreviewProps {
  board: Board;
}

/**
 * Gera um hash numérico determinístico a partir do ID ou título do quadro
 * para selecionar uma composição visual única quando o quadro ainda está vazio.
 */
export function getBoardPreviewVariant(seedStr: string): number {
  let hash = 2166136261;
  const input = seedStr || 'mirio-default';
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 4;
}

interface MiniMapData {
  viewBox: string;
  sortedElements: CanvasElement[];
  palette: string[];
}

/**
 * Calcula o enquadramento ideal (viewBox) e a paleta de cores predominante
 * para renderizar o mini-mapa SVG dos elementos reais do quadro.
 */
function computeMiniMapData(elements: CanvasElement[]): MiniMapData | null {
  if (!elements || elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const colorCounts = new Map<string, number>();

  for (const el of elements) {
    if (!el || typeof el.x !== 'number' || typeof el.y !== 'number') continue;
    const b = getElementWorldBounds(el);
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;

    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;

    const candidateColor =
      el.fill && el.fill !== 'transparent'
        ? el.fill
        : el.stroke && el.stroke !== 'transparent'
        ? el.stroke
        : null;

    if (candidateColor) {
      colorCounts.set(candidateColor, (colorCounts.get(candidateColor) || 0) + 1);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  const contentW = Math.max(120, maxX - minX);
  const contentH = Math.max(80, maxY - minY);
  const cx = minX + contentW / 2;
  const cy = minY + contentH / 2;

  // Proporção 16:9 aproximada para o header do card (ex: 320x144)
  const targetRatio = 2.25;
  // Garante um span mínimo elegante para que 1 único post-it não ocupe 100% da largura
  let spanW = Math.max(contentW * 1.28, 680);
  let spanH = Math.max(contentH * 1.28, 300);

  if (spanW / spanH > targetRatio) {
    spanH = spanW / targetRatio;
  } else {
    spanW = spanH * targetRatio;
  }

  const vbX = Math.round(cx - spanW / 2);
  const vbY = Math.round(cy - spanH / 2);
  const vbW = Math.round(spanW);
  const vbH = Math.round(spanH);

  const sortedElements = [...elements]
    .filter((el) => el && typeof el.x === 'number' && typeof el.y === 'number')
    .sort((a, b) => {
      if (a.type === 'frame' && b.type !== 'frame') return -1;
      if (a.type !== 'frame' && b.type === 'frame') return 1;
      return (a.zIndex || 0) - (b.zIndex || 0);
    })
    .slice(0, 60); // Limita a 60 elementos no mini-preview para performance 60fps

  const palette = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([color]) => color);

  return {
    viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    sortedElements,
    palette,
  };
}

export const BoardCardPreview: React.FC<BoardCardPreviewProps> = ({ board }) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);

  useEffect(() => {
    if (!board?.id) return;
    const unsubscribe = elementService.subscribeElements(board.id, (list) => {
      setElements(Array.isArray(list) ? list : []);
    });
    return () => unsubscribe();
  }, [board?.id]);

  const miniMap = useMemo(() => computeMiniMapData(elements), [elements]);
  const variant = useMemo(
    () => getBoardPreviewVariant(`${board.id}_${board.title || ''}`),
    [board.id, board.title]
  );

  return (
    <div className="h-36 bg-muted/25 dark:bg-muted/15 border-b border-border/60 flex items-center justify-center relative overflow-hidden select-none">
      {/* Grade Arquitetônica de Pontos com Máscara Radial Suave */}
      <div
        className="absolute inset-0 opacity-[0.22] dark:opacity-[0.28] transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          maskImage: 'radial-gradient(ellipse 85% 80% at 50% 50%, #000 60%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 85% 80% at 50% 50%, #000 60%, transparent 100%)',
        }}
      />

      {/* Efeito de Iluminação Atmosférica Sutil no Topo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, hsl(var(--foreground) / 0.04) 0%, transparent 70%)',
        }}
      />

      {miniMap ? (
        /* =====================================================================
           MODO 1: Mini-Mapa SVG Real dos Elementos do Quadro
           ===================================================================== */
        <div className="relative z-1 w-full h-full flex items-center justify-center p-2.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]">
          <svg
            viewBox={miniMap.viewBox}
            className="w-full h-full overflow-visible drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            preserveAspectRatio="xMidYMid meet"
            aria-label={`Prévia visual do quadro ${board.title}`}
          >
            {miniMap.sortedElements.map((el) => {
              const rot = el.rotation || 0;
              const bounds = getElementWorldBounds(el);
              const cx = bounds.x + bounds.w / 2;
              const cy = bounds.y + bounds.h / 2;
              const transform = rot ? `rotate(${rot} ${cx} ${cy})` : undefined;

              if (el.type === 'frame') {
                const w = el.width || 400;
                const h = el.height || 300;
                return (
                  <g key={el.id} transform={transform}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={w}
                      height={h}
                      rx={14}
                      fill={el.fill && el.fill !== 'transparent' ? el.fill : 'currentColor'}
                      fillOpacity={el.fill && el.fill !== 'transparent' ? 0.18 : 0.04}
                      stroke="currentColor"
                      strokeOpacity={0.25}
                      strokeWidth={4}
                      strokeDasharray="14 10"
                    />
                  </g>
                );
              }

              if (el.type === 'sticky') {
                const w = el.width || 180;
                const h = el.height || 180;
                const fill = el.fill || '#fff9b1';
                return (
                  <g key={el.id} transform={transform}>
                    <rect
                      x={el.x}
                      y={el.y + 4}
                      width={w}
                      height={h}
                      rx={12}
                      fill="#000000"
                      fillOpacity={0.08}
                    />
                    <rect
                      x={el.x}
                      y={el.y}
                      width={w}
                      height={h}
                      rx={12}
                      fill={fill}
                      stroke="#000000"
                      strokeOpacity={0.1}
                      strokeWidth={2}
                    />
                    {/* Linhas tipográficas simuladas dentro do post-it */}
                    <rect
                      x={el.x + w * 0.14}
                      y={el.y + h * 0.22}
                      width={w * 0.62}
                      height={Math.max(6, h * 0.055)}
                      rx={3}
                      fill="#0f172a"
                      fillOpacity={0.28}
                    />
                    <rect
                      x={el.x + w * 0.14}
                      y={el.y + h * 0.36}
                      width={w * 0.46}
                      height={Math.max(6, h * 0.055)}
                      rx={3}
                      fill="#0f172a"
                      fillOpacity={0.18}
                    />
                  </g>
                );
              }

              if (el.type === 'circle') {
                const r = el.radius || (el.width ? el.width / 2 : 60);
                const hasFill = el.fill && el.fill !== 'transparent';
                return (
                  <circle
                    key={el.id}
                    cx={el.x}
                    cy={el.y}
                    r={r}
                    fill={hasFill ? el.fill : 'currentColor'}
                    fillOpacity={hasFill ? 0.88 : 0.08}
                    stroke={el.stroke || 'currentColor'}
                    strokeOpacity={el.stroke ? 0.85 : 0.35}
                    strokeWidth={Math.max(4, el.strokeWidth || 4)}
                  />
                );
              }

              if (el.type === 'diamond') {
                const w = el.width || 120;
                const h = el.height || 120;
                const pts = `${el.x + w / 2},${el.y} ${el.x + w},${el.y + h / 2} ${
                  el.x + w / 2
                },${el.y + h} ${el.x},${el.y + h / 2}`;
                const hasFill = el.fill && el.fill !== 'transparent';
                return (
                  <polygon
                    key={el.id}
                    points={pts}
                    transform={transform}
                    fill={hasFill ? el.fill : 'currentColor'}
                    fillOpacity={hasFill ? 0.88 : 0.08}
                    stroke={el.stroke || 'currentColor'}
                    strokeOpacity={el.stroke ? 0.85 : 0.35}
                    strokeWidth={Math.max(4, el.strokeWidth || 4)}
                    strokeLinejoin="round"
                  />
                );
              }

              if (el.type === 'triangle') {
                const w = el.width || 120;
                const h = el.height || 120;
                const pts = `${el.x + w / 2},${el.y} ${el.x + w},${el.y + h} ${el.x},${el.y + h}`;
                const hasFill = el.fill && el.fill !== 'transparent';
                return (
                  <polygon
                    key={el.id}
                    points={pts}
                    transform={transform}
                    fill={hasFill ? el.fill : 'currentColor'}
                    fillOpacity={hasFill ? 0.88 : 0.08}
                    stroke={el.stroke || 'currentColor'}
                    strokeOpacity={el.stroke ? 0.85 : 0.35}
                    strokeWidth={Math.max(4, el.strokeWidth || 4)}
                    strokeLinejoin="round"
                  />
                );
              }

              if ((el.type === 'arrow' || el.type === 'line') && el.points && el.points.length >= 4) {
                const x1 = el.x + (el.points[0] || 0);
                const y1 = el.y + (el.points[1] || 0);
                const x2 = el.x + (el.points[2] || 0);
                const y2 = el.y + (el.points[3] || 0);
                return (
                  <line
                    key={el.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={el.stroke || 'currentColor'}
                    strokeOpacity={el.stroke ? 0.75 : 0.45}
                    strokeWidth={Math.max(5, (el.strokeWidth || 3) * 1.6)}
                    strokeLinecap="round"
                  />
                );
              }

              if (el.type === 'pen' && el.points && el.points.length >= 4) {
                const pairs: string[] = [];
                // Amostragem leve para curvas suaves sem sobrecarregar o DOM
                const step = el.points.length > 80 ? 4 : 2;
                for (let i = 0; i < el.points.length; i += step) {
                  const px = Math.round(el.x + (el.points[i] || 0));
                  const py = Math.round(el.y + (el.points[i + 1] || 0));
                  pairs.push(`${px},${py}`);
                }
                return (
                  <polyline
                    key={el.id}
                    points={pairs.join(' ')}
                    fill="none"
                    stroke={el.stroke || 'currentColor'}
                    strokeOpacity={el.opacity ?? 0.75}
                    strokeWidth={Math.max(5, (el.strokeWidth || 4) * 1.4)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }

              if (el.type === 'text') {
                const w = el.width || 160;
                const h = Math.max(16, (el.fontSize || 20) * 0.9);
                return (
                  <rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={w}
                    height={h}
                    rx={6}
                    transform={transform}
                    fill={el.textColor || el.fill || 'currentColor'}
                    fillOpacity={0.35}
                  />
                );
              }

              // Default: rect, star, sticker, gif
              const w = el.width || 120;
              const h = el.height || 100;
              const hasFill = el.fill && el.fill !== 'transparent';
              return (
                <rect
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  width={w}
                  height={h}
                  rx={10}
                  transform={transform}
                  fill={hasFill ? el.fill : 'currentColor'}
                  fillOpacity={hasFill ? 0.88 : 0.08}
                  stroke={el.stroke || 'currentColor'}
                  strokeOpacity={el.stroke ? 0.85 : 0.3}
                  strokeWidth={Math.max(4, el.strokeWidth || 3)}
                />
              );
            })}
          </svg>
        </div>
      ) : (
        /* =====================================================================
           MODO 2: Composições Arquitetônicas de Quadro Colaborativo (Quadros Novos/Vazios)
           Substitui o antigo placeholder estático por mini-cenas ricas e táteis
           ===================================================================== */
        <div className="relative z-1 w-full h-full flex items-center justify-center px-5 py-3">
          {variant === 0 && (
            /* Variante 0: Sprint & Post-its Conectados */
            <div className="relative w-48 h-24 flex items-center justify-center">
              {/* Moldura de fundo sutil */}
              <div className="absolute inset-x-2 inset-y-1 rounded-lg border border-dashed border-foreground/15 bg-background/40 dark:bg-background/20" />

              {/* Curva conectora SVG */}
              <svg
                viewBox="0 0 192 96"
                className="absolute inset-0 w-full h-full pointer-events-none text-foreground/25 dark:text-foreground/30"
                fill="none"
              >
                <path
                  d="M 62 46 C 85 46, 85 32, 106 32"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 2.5"
                />
                <path
                  d="M 62 52 C 88 52, 86 68, 112 68"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="62" cy="49" r="2" fill="currentColor" />
                <circle cx="112" cy="68" r="2" fill="currentColor" />
              </svg>

              {/* Post-it Amarelo Principal (Esquerda) */}
              <div className="absolute left-5 top-5 w-12 h-12 rounded-md bg-[#fef08a] dark:bg-[#fef08a]/90 border border-amber-900/15 shadow-xs p-2 flex flex-col justify-between -rotate-3 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-rotate-6">
                <div className="space-y-1">
                  <div className="w-6 h-1 rounded-full bg-amber-950/35" />
                  <div className="w-4 h-1 rounded-full bg-amber-950/20" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="size-1.5 rounded-full bg-amber-600/50" />
                  <span className="w-2.5 h-1 rounded-full bg-amber-950/20" />
                </div>
              </div>

              {/* Card Azul Celeste (Direita Topo) */}
              <div className="absolute right-8 top-3.5 w-14 h-7 rounded-md bg-[#bae6fd] dark:bg-[#bae6fd]/85 border border-sky-900/15 shadow-xs px-2 py-1.5 flex flex-col justify-center gap-1 rotate-1 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5">
                <div className="w-8 h-1 rounded-full bg-sky-950/35" />
                <div className="w-5 h-1 rounded-full bg-sky-950/20" />
              </div>

              {/* Card Verde Menta (Direita Base) */}
              <div className="absolute right-6 bottom-3 w-14 h-8 rounded-md bg-[#bbf7d0] dark:bg-[#bbf7d0]/85 border border-emerald-900/15 shadow-xs px-2 py-1.5 flex flex-col justify-between -rotate-1 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-y-0.5">
                <div className="w-7 h-1 rounded-full bg-emerald-950/35" />
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-600/60" />
                  <span className="w-4 h-1 rounded-full bg-emerald-950/20" />
                </div>
              </div>

              {/* Mini Cursor Colaborativo Flutuante */}
              <div className="absolute right-3 bottom-1.5 flex items-center gap-0.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1">
                <svg width="10" height="10" viewBox="0 0 16 16" className="text-blue-500 drop-shadow-xs">
                  <path
                    d="M2 2L14 6.5L8.5 8.5L6.5 14L2 2Z"
                    fill="currentColor"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          )}

          {variant === 1 && (
            /* Variante 1: Fluxo de Arquitetura & Decisão */
            <div className="relative w-48 h-24 flex items-center justify-center">
              <svg
                viewBox="0 0 192 96"
                className="absolute inset-0 w-full h-full pointer-events-none text-foreground/25 dark:text-foreground/30"
                fill="none"
              >
                <path d="M 56 48 L 80 48" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M 110 48 C 122 48, 122 28, 134 28"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M 110 48 C 122 48, 122 68, 134 68"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              </svg>

              {/* Nó Inicial (Esquerda) */}
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-11 h-9 rounded-md border border-border bg-background/95 shadow-xs p-1.5 flex flex-col justify-between transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-x-0.5">
                <div className="w-full h-1.5 rounded-xs bg-sky-500/30" />
                <div className="space-y-1">
                  <div className="w-6 h-1 rounded-full bg-foreground/30" />
                  <div className="w-4 h-1 rounded-full bg-foreground/15" />
                </div>
              </div>

              {/* Losango de Decisão (Centro) */}
              <div className="relative z-1 size-7 rotate-45 rounded-xs bg-[#fed7aa] dark:bg-[#fed7aa]/85 border border-orange-900/20 shadow-xs flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105">
                <div className="size-2 rounded-full bg-orange-950/35" />
              </div>

              {/* Nós de Saída (Direita) */}
              <div className="absolute right-4 top-4 w-11 h-6 rounded-md bg-[#dcfce7] dark:bg-[#dcfce7]/85 border border-emerald-900/15 shadow-xs px-1.5 flex items-center gap-1 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5">
                <span className="size-1.5 rounded-full bg-emerald-600/70 shrink-0" />
                <div className="w-5 h-1 rounded-full bg-emerald-950/30" />
              </div>

              <div className="absolute right-4 bottom-4 w-11 h-6 rounded-md bg-[#f3e8ff] dark:bg-[#f3e8ff]/85 border border-purple-900/15 shadow-xs px-1.5 flex items-center gap-1 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-y-0.5">
                <span className="size-1.5 rounded-full bg-purple-600/70 shrink-0" />
                <div className="w-5 h-1 rounded-full bg-purple-950/30" />
              </div>
            </div>
          )}

          {variant === 2 && (
            /* Variante 2: Cluster de Brainstorm & Ideação */
            <div className="relative w-48 h-24 flex items-center justify-center">
              {/* Linha curva de conexão */}
              <svg
                viewBox="0 0 192 96"
                className="absolute inset-0 w-full h-full pointer-events-none text-foreground/20 dark:text-foreground/25"
                fill="none"
              >
                <path
                  d="M 52 54 Q 96 24 140 50"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>

              {/* Post-it Rosa (Esquerda) */}
              <div className="w-11 h-11 rounded-md bg-[#fce7f3] dark:bg-[#fce7f3]/85 border border-pink-900/15 shadow-xs p-2 flex flex-col justify-between -rotate-6 -mr-1.5 z-1 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-x-1 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-rotate-8">
                <div className="space-y-1">
                  <div className="w-6 h-1 rounded-full bg-pink-950/35" />
                  <div className="w-4 h-1 rounded-full bg-pink-950/20" />
                </div>
                <span className="size-1.5 rounded-full bg-pink-500/60" />
              </div>

              {/* Post-it Amarelo Central (Destaque) */}
              <div className="w-13 h-13 rounded-md bg-[#fff9b1] dark:bg-[#fff9b1]/90 border border-amber-900/15 shadow-sm p-2.5 flex flex-col justify-between rotate-2 z-2 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1">
                <div className="space-y-1">
                  <div className="w-7 h-1 rounded-full bg-amber-950/40" />
                  <div className="w-5 h-1 rounded-full bg-amber-950/25" />
                  <div className="w-6 h-1 rounded-full bg-amber-950/20" />
                </div>
                <div className="flex items-center justify-end">
                  <span className="px-1 py-0.2 rounded-full bg-amber-950/10 text-[7px] font-mono text-amber-950/70 leading-none">
                    +1
                  </span>
                </div>
              </div>

              {/* Post-it Lilás (Direita) */}
              <div className="w-11 h-11 rounded-md bg-[#e9d5ff] dark:bg-[#e9d5ff]/85 border border-purple-900/15 shadow-xs p-2 flex flex-col justify-between -rotate-2 -ml-1.5 z-1 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1 [@media(hover:hover)_and_(pointer:fine)]:group-hover:rotate-3">
                <div className="space-y-1">
                  <div className="w-5 h-1 rounded-full bg-purple-950/35" />
                  <div className="w-4 h-1 rounded-full bg-purple-950/20" />
                </div>
                <span className="size-1.5 rounded-full bg-purple-500/60" />
              </div>
            </div>
          )}

          {variant === 3 && (
            /* Variante 3: Raias de Retrospectiva / Kanban */
            <div className="relative w-48 h-24 flex items-center justify-center gap-2.5">
              {/* Raia 1 */}
              <div className="w-18 h-20 rounded-md border border-border/80 bg-background/70 dark:bg-background/40 p-1.5 flex flex-col gap-1.5 shadow-2xs transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5">
                <div className="flex items-center gap-1 pb-1 border-b border-border/50">
                  <span className="size-1.5 rounded-full bg-emerald-500/70" />
                  <div className="w-7 h-1 rounded-full bg-foreground/30" />
                </div>
                <div className="w-full h-5 rounded-xs bg-[#dcfce7] dark:bg-[#dcfce7]/85 border border-emerald-900/10 p-1 flex flex-col justify-center gap-0.5">
                  <div className="w-8 h-0.5 rounded-full bg-emerald-950/35" />
                  <div className="w-5 h-0.5 rounded-full bg-emerald-950/20" />
                </div>
                <div className="w-full h-5 rounded-xs bg-[#fef08a] dark:bg-[#fef08a]/85 border border-amber-900/10 p-1 flex flex-col justify-center gap-0.5">
                  <div className="w-7 h-0.5 rounded-full bg-amber-950/35" />
                  <div className="w-4 h-0.5 rounded-full bg-amber-950/20" />
                </div>
              </div>

              {/* Raia 2 */}
              <div className="w-18 h-20 rounded-md border border-border/80 bg-background/70 dark:bg-background/40 p-1.5 flex flex-col gap-1.5 shadow-2xs transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-y-0.5">
                <div className="flex items-center gap-1 pb-1 border-b border-border/50">
                  <span className="size-1.5 rounded-full bg-sky-500/70" />
                  <div className="w-6 h-1 rounded-full bg-foreground/30" />
                </div>
                <div className="w-full h-5 rounded-xs bg-[#e0f2fe] dark:bg-[#e0f2fe]/85 border border-sky-900/10 p-1 flex flex-col justify-center gap-0.5">
                  <div className="w-9 h-0.5 rounded-full bg-sky-950/35" />
                  <div className="w-6 h-0.5 rounded-full bg-sky-950/20" />
                </div>
                <div className="w-full h-5 rounded-xs border border-dashed border-foreground/15 flex items-center justify-center">
                  <div className="w-4 h-0.5 rounded-full bg-foreground/15" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra Inferior Flutuante de Metadados Visuais do Canvas */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-2 flex items-center justify-between pointer-events-none">
        {elements.length > 0 ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/85 dark:bg-background/75 backdrop-blur-xs border border-border/60 shadow-2xs">
            <Layers className="size-2.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-foreground/80 tabular-nums">
              {elements.length} {elements.length === 1 ? 'item' : 'itens'}
            </span>
            {miniMap && miniMap.palette.length > 0 && (
              <div className="flex items-center -space-x-1 ml-0.5">
                {miniMap.palette.map((color, idx) => (
                  <span
                    key={`${color}-${idx}`}
                    className="size-2 rounded-full ring-1 ring-background"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/75 dark:bg-background/60 backdrop-blur-xs border border-border/50 text-[10px] text-muted-foreground">
            <Sparkles className="size-2.5 text-amber-500/80" />
            <span>Canvas livre</span>
          </div>
        )}

        {/* Indicador sutil de abrir no hover (apenas dispositivos com ponteiro fino) */}
        <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background/85 dark:bg-background/75 backdrop-blur-xs border border-border/60 text-[10px] font-medium text-foreground opacity-0 translate-y-1 transition-[opacity,transform] duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-y-0">
          <span>Abrir</span>
          <ArrowUpRight className="size-2.5" />
        </div>
      </div>
    </div>
  );
};
