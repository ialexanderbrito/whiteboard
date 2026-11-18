import React, { useEffect, useState, useRef } from 'react';
import { reactionService, type GlobalReactionEvent } from '@/services/reactionService';
import { getAppleEmojiUrl } from '@/utils/appleEmoji';
import {
  getReactionImageUrl,
  MIRIO_REACTION,
  DITADOR_REACTION,
  BRIGADEIRO_REACTION,
} from '@/utils/mirioReaction';

interface ReactionParticle {
  emoji: string;
  x: number;
  startY: number;
  travelY: number;
  swayAmpX: number;
  swayFreq: number;
  swayPhase: number;
  maxRotRad: number;
  bornAt: number;
  delayMs: number;
  durationMs: number;
  sizePx: number;
}

interface ReactionAuthorNotification {
  id: string;
  userName: string;
  emoji: string;
  timestamp: number;
}

interface GlobalReactionsOverlayProps {
  boardId: string;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '🤯', '🎉', '👋', '🚀', '💡', '👀'];
const SPRITE_SIZE = 96;

// Cache global de sprites pré-rasterizados (com sombra já embutida no bitmap para custo zero de blur por frame)
const spriteCanvasCache = new Map<string, HTMLCanvasElement>();
const pendingSpriteLoads = new Set<string>();

function detectLowPowerDevice(): { isLowEnd: boolean; reducedMotion: boolean } {
  if (typeof window === 'undefined') {
    return { isLowEnd: false, reducedMotion: false };
  }
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  const memory =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
      : 8;
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  const isLowEnd = cores <= 4 || memory <= 4 || coarsePointer;
  return { isLowEnd, reducedMotion };
}

function bakeImageSprite(key: string, img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const offscreen = document.createElement('canvas');
  offscreen.width = SPRITE_SIZE;
  offscreen.height = SPRITE_SIZE;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  const pad = 12;
  const drawSize = SPRITE_SIZE - pad * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(img, pad, pad, drawSize, drawSize);
  ctx.restore();

  spriteCanvasCache.set(key, offscreen);
  return offscreen;
}

function bakeUnicodeFallbackSprite(emoji: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const fallbackKey = `unicode_${emoji}`;
  const existing = spriteCanvasCache.get(fallbackKey);
  if (existing) return existing;

  const offscreen = document.createElement('canvas');
  offscreen.width = SPRITE_SIZE;
  offscreen.height = SPRITE_SIZE;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  ctx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, SPRITE_SIZE / 2, SPRITE_SIZE / 2 + 2);
  ctx.restore();

  spriteCanvasCache.set(fallbackKey, offscreen);
  return offscreen;
}

function ensureReactionSprite(emoji: string): HTMLCanvasElement | null {
  const cached = spriteCanvasCache.get(emoji);
  if (cached) return cached;

  const customUrl = getReactionImageUrl(emoji);
  const srcUrl = customUrl || getAppleEmojiUrl(emoji);

  if (srcUrl && !pendingSpriteLoads.has(emoji) && typeof Image !== 'undefined') {
    pendingSpriteLoads.add(emoji);
    const img = new Image();
    if (!customUrl) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      pendingSpriteLoads.delete(emoji);
      bakeImageSprite(emoji, img);
    };
    img.onerror = () => {
      if (!customUrl) {
        const retry = new Image();
        retry.onload = () => {
          pendingSpriteLoads.delete(emoji);
          bakeImageSprite(emoji, retry);
        };
        retry.onerror = () => {
          pendingSpriteLoads.delete(emoji);
        };
        retry.src = srcUrl;
      } else {
        pendingSpriteLoads.delete(emoji);
      }
    };
    img.src = srcUrl;
  }

  return customUrl ? null : bakeUnicodeFallbackSprite(emoji);
}

// Curva cubic-bezier rápida aproximada (ease-out fluida sem salto final)
function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

export const GlobalReactionsOverlay: React.FC<GlobalReactionsOverlayProps> = ({ boardId }) => {
  const [activeAuthor, setActiveAuthor] = useState<ReactionAuthorNotification | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ReactionParticle[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const authorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hwProfileRef = useRef<{ isLowEnd: boolean; reducedMotion: boolean; liteMode: boolean }>({
    ...detectLowPowerDevice(),
    liteMode: false,
  });

  // Pré-carregamento imediato em background dos sprites de reação
  useEffect(() => {
    COMMON_EMOJIS.forEach((emoji) => {
      ensureReactionSprite(emoji);
    });
    if (getReactionImageUrl(MIRIO_REACTION)) {
      ensureReactionSprite(MIRIO_REACTION);
    }
    if (getReactionImageUrl(DITADOR_REACTION)) {
      ensureReactionSprite(DITADOR_REACTION);
    }
    if (getReactionImageUrl(BRIGADEIRO_REACTION)) {
      ensureReactionSprite(BRIGADEIRO_REACTION);
    }
  }, []);

  useEffect(() => {
    const particles = particlesRef.current;
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (authorTimerRef.current) {
        clearTimeout(authorTimerRef.current);
        authorTimerRef.current = null;
      }
      particles.length = 0;
    };
  }, []);

  useEffect(() => {
    if (!boardId) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasDpr = 1;
    let slowFramesStreak = 0;
    let lastFrameAt = 0;

    const syncCanvasDimensions = (canvas: HTMLCanvasElement) => {
      const { isLowEnd } = hwProfileRef.current;
      const maxDpr = isLowEnd ? 1.25 : 1.75;
      const nextDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      if (nextW !== canvasWidth || nextH !== canvasHeight || nextDpr !== canvasDpr) {
        canvasWidth = nextW;
        canvasHeight = nextH;
        canvasDpr = nextDpr;
        canvas.width = Math.round(nextW * nextDpr);
        canvas.height = Math.round(nextH * nextDpr);
      }
    };

    const renderFrame = (now: number) => {
      const canvas = canvasRef.current;
      const particles = particlesRef.current;

      if (!canvas || particles.length === 0) {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.display = 'none';
        }
        rafIdRef.current = null;
        lastFrameAt = 0;
        return;
      }

      // Governador adaptativo de FPS: ativa modo ultra-leve automaticamente se detectar engasgos (>26ms)
      if (lastFrameAt > 0) {
        const dt = now - lastFrameAt;
        if (dt > 26 && dt < 250) {
          slowFramesStreak++;
          if (slowFramesStreak >= 4 && !hwProfileRef.current.liteMode) {
            hwProfileRef.current.liteMode = true;
          }
        } else if (dt <= 19 && slowFramesStreak > 0) {
          slowFramesStreak = 0;
        }
      }
      lastFrameAt = now;

      syncCanvasDimensions(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafIdRef.current = null;
        return;
      }

      ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const { reducedMotion, liteMode, isLowEnd } = hwProfileRef.current;
      const skipRotation = reducedMotion || liteMode || isLowEnd;

      // Compactação in-place O(N) sem alocar novos arrays por frame (zero pressão de Garbage Collector)
      let writeIdx = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const elapsed = now - p.bornAt - p.delayMs;

        if (elapsed < 0) {
          particles[writeIdx++] = p;
          continue;
        }

        const progress = elapsed / p.durationMs;
        if (progress >= 1) {
          continue;
        }

        const easedRise = easeOutCubic(progress);
        const y = p.startY - p.travelY * easedRise;

        // Culling vertical imediato se já cruzou o topo da tela
        if (y < -p.sizePx) {
          continue;
        }

        particles[writeIdx++] = p;

        const sprite = spriteCanvasCache.get(p.emoji) || ensureReactionSprite(p.emoji);
        if (!sprite) continue;

        // Envelope suave de entrada (pop) e fade-out nos 22% finais da trajetória
        let scale = 1;
        if (progress < 0.1) {
          const popT = progress / 0.1;
          scale = 0.45 + 0.65 * easeOutCubic(popT);
        } else if (progress < 0.18) {
          scale = 1.1 - ((progress - 0.1) / 0.08) * 0.1;
        }

        let alpha = 1;
        if (progress < 0.06) {
          alpha = progress / 0.06;
        } else if (progress > 0.76) {
          alpha = Math.max(0, 1 - (progress - 0.76) / 0.24);
        }

        const swayWave = reducedMotion
          ? 0
          : Math.sin(elapsed * p.swayFreq + p.swayPhase);
        const x = p.x + swayWave * p.swayAmpX;
        const drawSize = p.sizePx * scale;

        ctx.globalAlpha = alpha;
        if (skipRotation) {
          // Fast-path alinhado aos eixos (máxima performance em GPUs integradas/fracas)
          ctx.drawImage(sprite, x - drawSize * 0.5, y - drawSize * 0.5, drawSize, drawSize);
        } else {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(swayWave * p.maxRotRad);
          ctx.drawImage(sprite, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
      particles.length = writeIdx;

      if (particles.length > 0) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        canvas.style.display = 'none';
        rafIdRef.current = null;
        lastFrameAt = 0;
      }
    };

    const startLoopIfNeeded = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.style.display === 'none') {
        canvas.style.display = 'block';
      }
      if (rafIdRef.current === null && typeof requestAnimationFrame !== 'undefined') {
        rafIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    const unsubscribe = reactionService.subscribeReactions(boardId, (event: GlobalReactionEvent) => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // Garante aquecimento do sprite antes do primeiro frame
      ensureReactionSprite(event.emoji);

      // 1. Notificação enxuta do autor na base da tela (1 único timer reaproveitado, sem cascata)
      if (event.userName && event.userName.trim() !== '') {
        const notifId = `author_${event.id}`;
        setActiveAuthor((prev) => {
          if (prev && prev.userName === event.userName && prev.emoji === event.emoji) {
            return prev;
          }
          return {
            id: notifId,
            userName: event.userName,
            emoji: event.emoji,
            timestamp: Date.now(),
          };
        });

        if (authorTimerRef.current) {
          clearTimeout(authorTimerRef.current);
        }
        authorTimerRef.current = setTimeout(() => {
          setActiveAuthor(null);
          authorTimerRef.current = null;
        }, 2200);
      }

      // 2. Orçamento adaptativo de partículas: visual rico sem sobrecarregar máquinas modestas
      const { isLowEnd, reducedMotion, liteMode } = hwProfileRef.current;
      const activeCount = particlesRef.current.length;
      const maxCap = reducedMotion ? 24 : isLowEnd || liteMode ? 52 : 110;
      const baseBurst = reducedMotion ? 6 : isLowEnd || liteMode ? 10 : 20;

      // Reduz suavemente o tamanho de novas rajadas quando já há muitas partículas no ar
      const loadFactor = Math.max(0.3, 1 - activeCount / maxCap);
      const spawnCount = Math.max(4, Math.round(baseBurst * loadFactor));

      // Se atingir o teto, recicla as partículas mais antigas (já no topo/transparentes)
      const overflow = activeCount + spawnCount - maxCap;
      if (overflow > 0) {
        particlesRef.current.splice(0, overflow);
      }

      const margin = 44;
      const availableWidth = Math.max(260, windowWidth - margin * 2);
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      for (let i = 0; i < spawnCount; i++) {
        // Distribuição estratificada + jitter para cobrir a largura de forma natural com menos partículas
        const stratumWidth = availableWidth / spawnCount;
        const startX =
          margin + stratumWidth * i + Math.random() * stratumWidth;

        particlesRef.current.push({
          emoji: event.emoji,
          x: startX,
          startY: windowHeight + 28 + Math.random() * 44,
          travelY: windowHeight * (0.78 + Math.random() * 0.32),
          swayAmpX: 10 + Math.random() * 22,
          swayFreq: 0.0024 + Math.random() * 0.0014,
          swayPhase: Math.random() * Math.PI * 2,
          maxRotRad: ((4 + Math.random() * 9) * Math.PI) / 180,
          bornAt: now,
          delayMs: Math.random() * 380,
          durationMs: 2800 + Math.random() * 1100,
          sizePx: 28 + Math.random() * 22,
        });
      }

      startLoopIfNeeded();
    });

    return unsubscribe;
  }, [boardId]);

  const authorReactionImage = activeAuthor ? getReactionImageUrl(activeAuthor.emoji) : null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none"
      style={{ contain: 'strict' }}
    >
      {/* Único Canvas 2D leve (oculto quando ocioso = zero custo de camada/GPU parado) */}
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* Badge discreto do autor da reação na base central da tela */}
      {activeAuthor && (
        <div
          key={`${activeAuthor.userName}_${activeAuthor.emoji}`}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/95 text-foreground border border-border/80 shadow-md text-xs font-semibold whitespace-nowrap">
            <span className="text-muted-foreground font-medium">
              {activeAuthor.userName} reagiu com
            </span>
            {authorReactionImage ? (
              <img
                src={authorReactionImage}
                alt="Reação especial"
                className="size-5 object-contain"
              />
            ) : (
              <span className="text-base leading-none">{activeAuthor.emoji}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
