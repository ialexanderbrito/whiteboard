import React, { useEffect, useRef } from 'react';
import type { UserPresence, CurrentUser } from '../../types/board';
import type { ToolType } from '../../types/element';
import { getViewport } from '../../utils/viewport';

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface LaserParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface LaserPulseRing {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: string;
}

interface LaserTrailOverlayProps {
  currentTool: ToolType;
  currentUser?: CurrentUser | null;
  localLaserPosRef: React.RefObject<{ x: number; y: number } | null>;
  isLocalDrawingRef: React.RefObject<boolean>;
  localPointsRef: React.RefObject<LaserPoint[]>;
  remoteUsers: UserPresence[];
}

// O laser é tradicionalmente e universalmente VERMELHO vívido de alta luminescência
const LASER_COLOR = '#ff1744'; // Vermelho laser clássico puro
const LASER_HOT_COLOR = '#ff5252'; // Vermelho vibrante de emissão
const TRAIL_DURATION_MS = 1000; // 1s de cauda dinâmica ágil (Miro/FigJam/Keynote)
const BASE_STROKE_WIDTH = 5.5; // Espessura base do feixe

// Emil Kowalski easing curve para expansão orgânica de pulso/shockwave
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const LaserTrailOverlay: React.FC<LaserTrailOverlayProps> = ({
  currentTool,
  localLaserPosRef,
  isLocalDrawingRef,
  localPointsRef,
  remoteUsers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const currentToolRef = useRef(currentTool);
  const remoteUsersRef = useRef(remoteUsers);

  // Partículas dinâmicas e anéis de choque
  const particlesRef = useRef<LaserParticle[]>([]);
  const pulseRingsRef = useRef<LaserPulseRing[]>([]);
  const lastDrawingStateRef = useRef<boolean>(false);
  const remoteLastDrawingMap = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  const hasRemoteLaser = remoteUsers.some(
    (user) =>
      user.activeTool === 'laser' ||
      Boolean(user.laser?.isDrawing) ||
      Boolean(user.laser?.points?.length)
  );

  // Mapeamento persistente de rastros de usuários remotos: userId -> LaserPoint[]
  const remoteTrailsRef = useRef<Map<string, LaserPoint[]>>(new Map());
  const lastHandledTimestamps = useRef<Map<string, number>>(new Map());

  // Atualiza histórico dos colegas com distribuição temporal suave dos lotes recebidos
  useEffect(() => {
    const now = Date.now();
    const trails = remoteTrailsRef.current;
    const handledMap = lastHandledTimestamps.current;
    const lastDrawingMap = remoteLastDrawingMap.current;

    remoteUsers.forEach((user) => {
      if (!user.laser) return;
      const { isDrawing, points, timestamp } = user.laser;
      const lastHandled = handledMap.get(user.userId) || 0;

      // Dispara pulso de anel quando colega clica/inicia o desenho laser
      const wasDrawing = lastDrawingMap.get(user.userId) || false;
      if (isDrawing && !wasDrawing && user.cursor) {
        pulseRingsRef.current.push({
          x: user.cursor.x,
          y: user.cursor.y,
          startTime: now,
          duration: 420,
          color: user.color || LASER_COLOR,
        });
      }
      lastDrawingMap.set(user.userId, Boolean(isDrawing));

      if (timestamp && timestamp !== lastHandled) {
        handledMap.set(user.userId, timestamp);

        if (!trails.has(user.userId)) {
          trails.set(user.userId, []);
        }
        const userTrail = trails.get(user.userId)!;

        if (points && points.length > 0) {
          // Distribui os pontos no intervalo de tempo (~50ms) para que a cauda desvaneça de modo fluído e contínuo
          const batchCount = points.length;
          const batchWindow = Math.min(80, Math.max(20, batchCount * 12));
          points.forEach(([px, py], idx) => {
            const last = userTrail[userTrail.length - 1];
            if (!last || Math.hypot(px - last.x, py - last.y) >= 2.5) {
              const pointTime = now - batchWindow + (idx / Math.max(1, batchCount - 1)) * batchWindow;
              userTrail.push({ x: px, y: py, timestamp: pointTime });
            }
          });
        } else if (isDrawing && user.cursor) {
          const last = userTrail[userTrail.length - 1];
          if (!last || Math.hypot(user.cursor.x - last.x, user.cursor.y - last.y) >= 2.5) {
            userTrail.push({ x: user.cursor.x, y: user.cursor.y, timestamp: now });
          }
        }
      }
    });

    const activeIds = new Set(remoteUsers.map((u) => u.userId));
    for (const id of trails.keys()) {
      if (!activeIds.has(id)) {
        trails.delete(id);
        handledMap.delete(id);
        lastDrawingMap.delete(id);
      }
    }
  }, [remoteUsers]);

  // Render loop 60/120fps nativo com feixe incandescente e emissor de partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const idleFramesToStop = 12;
    let idleFrames = 0;

    let dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const hasActiveLaser = () => {
      if (currentToolRef.current === 'laser') return true;
      return remoteUsersRef.current.some(
        (user) => user.activeTool === 'laser' || Boolean(user.laser?.isDrawing)
      );
    };

    /**
     * Emite partículas de brilho (laser plasma sparks) ao desenhar
     */
    const spawnSparkles = (x: number, y: number, count = 2) => {
      for (let i = 0; i < count; i++) {
        if (particlesRef.current.length > 50) break; // Limite de proteção
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.2;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 220 + Math.random() * 160,
          size: 1.2 + Math.random() * 1.8,
          color: Math.random() > 0.4 ? LASER_HOT_COLOR : '#ffffff',
        });
      }
    };

    const render = () => {
      if (!isRunning) return;

      const now = Date.now();
      const { x: stageX, y: stageY, scale } = getViewport();

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Transforma coordenadas para o espaço do Whiteboard (Pan & Zoom)
      ctx.translate(stageX, stageY);
      ctx.scale(scale, scale);

      let drewAnything = false;

      // Detecta clique local para disparar onda de choque (Shockwave Ring)
      const isLocalDrawing = Boolean(isLocalDrawingRef.current);
      const localPos = localLaserPosRef.current;
      if (currentToolRef.current === 'laser' && isLocalDrawing && !lastDrawingStateRef.current && localPos) {
        pulseRingsRef.current.push({
          x: localPos.x,
          y: localPos.y,
          startTime: now,
          duration: 400,
          color: LASER_COLOR,
        });
        spawnSparkles(localPos.x, localPos.y, 4);
      }
      lastDrawingStateRef.current = isLocalDrawing;

      // Gera faíscas quando desenhando localmente com movimento
      if (currentToolRef.current === 'laser' && isLocalDrawing && localPos && Math.random() > 0.4) {
        spawnSparkles(localPos.x, localPos.y, 1);
      }

      /**
       * Desenha o rastro do laser contínuo e fluído sem emendas rígidas
       * Renderização em 3 camadas ópticas: Halo de Bloom, Feixe Intenso e Núcleo Incandescente
       */
      const drawLaserTrail = (rawPoints: LaserPoint[]) => {
        if (!rawPoints || rawPoints.length < 2) return;

        // 1. Filtra pontos expirados e remove jitter micro-duplicado (< 2.5px)
        const valid: LaserPoint[] = [];
        for (let i = 0; i < rawPoints.length; i++) {
          const p = rawPoints[i];
          if (now - p.timestamp > TRAIL_DURATION_MS) continue;
          const last = valid[valid.length - 1];
          if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 2.5) {
            valid.push(p);
          }
        }

        if (valid.length < 2) return;

        // 2. Segmentos com curvas Bézier quadráticas contínuas
        const CHUNK_SIZE = 4;
        const numPoints = valid.length;

        for (let i = 0; i < numPoints - 1; i += CHUNK_SIZE - 1) {
          const endIdx = Math.min(i + CHUNK_SIZE, numPoints);
          const chunk = valid.slice(i, endIdx);
          if (chunk.length < 2) continue;

          const midPoint = chunk[Math.floor(chunk.length / 2)];
          const age = now - midPoint.timestamp;
          const progress = Math.max(0.04, Math.min(1, 1 - age / TRAIL_DURATION_MS));

          // Easing suave para afunilamento natural da cauda
          const opacity = Math.pow(progress, 1.2);
          const strokeW = Math.max(1.8, (BASE_STROKE_WIDTH * (0.2 + 0.8 * progress)) / scale);
          const isFirstChunk = (i === 0);

          const traceSpline = () => {
            ctx.moveTo(chunk[0].x, chunk[0].y);
            for (let j = 0; j < chunk.length - 1; j++) {
              const pCurr = chunk[j];
              const pNext = chunk[j + 1];
              const midX = (pCurr.x + pNext.x) / 2;
              const midY = (pCurr.y + pNext.y) / 2;
              ctx.quadraticCurveTo(pCurr.x, pCurr.y, midX, midY);
            }
            ctx.lineTo(chunk[chunk.length - 1].x, chunk[chunk.length - 1].y);
          };

          // Camada 1: Halo Neon Vermelho Radiante
          ctx.beginPath();
          traceSpline();
          ctx.strokeStyle = LASER_COLOR;
          ctx.lineWidth = strokeW * 2.4;
          ctx.lineCap = isFirstChunk ? 'round' : 'butt';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = opacity * 0.38;
          ctx.stroke();

          // Camada 2: Feixe Vermelho Laser Intenso
          ctx.beginPath();
          traceSpline();
          ctx.strokeStyle = LASER_HOT_COLOR;
          ctx.lineWidth = strokeW;
          ctx.lineCap = isFirstChunk ? 'round' : 'butt';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = opacity * 0.92;
          ctx.stroke();

          // Camada 3: Núcleo Branco Incandescente (Hot Plasma Core)
          ctx.beginPath();
          traceSpline();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.8, strokeW * 0.36);
          ctx.lineCap = isFirstChunk ? 'round' : 'butt';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = opacity * 0.98;
          ctx.stroke();
        }
      };

      /**
       * Desenha o ponto focal do laser na ponta da mira (com flare e anel difuso)
       */
      const drawLaserPointerDot = (
        x: number,
        y: number,
        isDrawing: boolean,
        userName?: string,
        userColor?: string
      ) => {
        const pulse = Math.sin(now / 110);
        const haloRadius = Math.max(5, (8.5 + (isDrawing ? 3.5 : 1.8) * pulse) / scale);
        const coreRadius = Math.max(2.6, 4.4 / scale);
        const centerWhite = Math.max(1.3, 2.4 / scale);

        // 1. Halo Difuso Pulsante
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = LASER_COLOR;
        ctx.globalAlpha = isDrawing ? 0.55 : 0.32;
        ctx.fill();
        ctx.restore();

        // 2. Anel de Brilho Vermelho Sólido
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = LASER_HOT_COLOR;
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.restore();

        // 3. Núcleo Branco Incandescente de Luz Focal
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, centerWhite, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.restore();

        // 4. Lens Flare óptico dinâmico na ponta do feixe ao desenhar
        if (isDrawing) {
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.8, 1.3 / scale);
          ctx.globalAlpha = 0.88;
          const flareLen = Math.max(6, 12 / scale);

          ctx.beginPath();
          ctx.moveTo(x - flareLen, y);
          ctx.lineTo(x + flareLen, y);
          ctx.moveTo(x, y - flareLen);
          ctx.lineTo(x, y + flareLen);
          ctx.stroke();
          ctx.restore();
        }

        // 5. Tag elegante de identificação do colega (se for usuário remoto)
        if (userName) {
          ctx.save();
          const fontSize = Math.max(10, 11 / scale);
          ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
          const text = userName;
          const textMetrics = ctx.measureText(text);
          const textW = textMetrics.width;
          const padX = 6 / scale;
          const tagH = 17 / scale;
          const tagW = textW + padX * 2 + 10 / scale;
          const tagX = x + 12 / scale;
          const tagY = y - 22 / scale;

          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, 8 / scale);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.strokeStyle = userColor || LASER_COLOR;
          ctx.lineWidth = Math.max(1, 1.2 / scale);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(tagX + padX + 3 / scale, tagY + tagH / 2, 2.5 / scale, 0, Math.PI * 2);
          ctx.fillStyle = userColor || '#3b82f6';
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, tagX + padX + 8 / scale, tagY + tagH / 2 + 3.5 / scale);
          ctx.restore();
        }
      };

      // A. Desenha os anéis de choque pulsantes (Laser Shockwaves)
      const activePulseRings: LaserPulseRing[] = [];
      pulseRingsRef.current.forEach((ring) => {
        const elapsed = now - ring.startTime;
        if (elapsed < ring.duration) {
          activePulseRings.push(ring);
          drewAnything = true;
          const p = elapsed / ring.duration;
          const eased = easeOutCubic(p);
          const radius = (6 + eased * 26) / scale;
          const ringAlpha = (1 - p) * 0.75;

          ctx.save();
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = Math.max(1, ((1 - p) * 2.2) / scale);
          ctx.globalAlpha = ringAlpha;
          ctx.stroke();
          ctx.restore();
        }
      });
      pulseRingsRef.current = activePulseRings;

      // B. Desenha partículas de plasma (Embers / Sparks)
      const activeParticles: LaserParticle[] = [];
      particlesRef.current.forEach((particle) => {
        particle.life += 16;
        if (particle.life < particle.maxLife) {
          activeParticles.push(particle);
          drewAnything = true;
          particle.x += (particle.vx / scale) * 0.8;
          particle.y += (particle.vy / scale) * 0.8;
          particle.vx *= 0.94;
          particle.vy *= 0.94;

          const progress = 1 - particle.life / particle.maxLife;
          const pSize = Math.max(0.8, (particle.size * progress) / scale);

          ctx.save();
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, pSize, 0, Math.PI * 2);
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = progress * 0.9;
          ctx.fill();
          ctx.restore();
        }
      });
      particlesRef.current = activeParticles;

      // C. Desenha rastros e ponteiros dos colegas remotos
      const remoteTrails = remoteTrailsRef.current;
      const users = remoteUsersRef.current;
      users.forEach((user) => {
        const trail = remoteTrails.get(user.userId);
        if (trail && trail.length > 0) {
          const valid = trail.filter((p) => now - p.timestamp <= TRAIL_DURATION_MS);
          remoteTrails.set(user.userId, valid);
          if (valid.length > 0) drewAnything = true;
          drawLaserTrail(valid);
        }

        if (user.activeTool === 'laser' && user.cursor) {
          drewAnything = true;
          drawLaserPointerDot(
            user.cursor.x,
            user.cursor.y,
            Boolean(user.laser?.isDrawing),
            user.name || 'Colega',
            user.color
          );
        }
      });

      // D. Desenha o rastro do usuário local
      const localPoints = localPointsRef.current;
      if (localPoints && localPoints.length > 0) {
        const validLocal = localPoints.filter((p) => now - p.timestamp <= TRAIL_DURATION_MS);
        localPointsRef.current = validLocal;
        if (validLocal.length > 0) drewAnything = true;
        drawLaserTrail(validLocal);
      }

      // E. Desenha o ponto focal do laser do usuário local
      if (currentToolRef.current === 'laser' && localPos) {
        drewAnything = true;
        drawLaserPointerDot(localPos.x, localPos.y, isLocalDrawing);
      }

      ctx.restore();

      if (!drewAnything && !hasActiveLaser()) {
        idleFrames += 1;
        if (idleFrames >= idleFramesToStop) {
          isRunning = false;
          rafId.current = null;
          return;
        }
      } else {
        idleFrames = 0;
      }

      rafId.current = requestAnimationFrame(render);
    };

    if (currentTool === 'laser' || hasRemoteLaser) {
      rafId.current = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [currentTool, hasRemoteLaser, localLaserPosRef, isLocalDrawingRef, localPointsRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 select-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
