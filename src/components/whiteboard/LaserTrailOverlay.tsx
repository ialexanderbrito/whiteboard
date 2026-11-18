import React, { useEffect, useRef } from 'react';
import type { UserPresence, CurrentUser } from '../../types/board';
import type { ToolType } from '../../types/element';
import { getViewport } from '../../utils/viewport';
import {
  DEFAULT_LASER_COLOR,
  computeRibbonSamples,
  getLaserOpticalPalette,
  sanitizeLaserColor,
  smoothLaserStroke,
  splitLaserStrokes,
  type LaserPoint,
  type RibbonSample,
} from '../../utils/laserGeometry.ts';

export type { LaserPoint };

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
  laserColor?: string;
  localLaserPosRef: React.RefObject<{ x: number; y: number } | null>;
  isLocalDrawingRef: React.RefObject<boolean>;
  localPointsRef: React.RefObject<LaserPoint[]>;
  remoteUsers: UserPresence[];
}

const TRAIL_DURATION_MS = 1050; // Cauda ágil estilo FigJam / Miro / Keynote
const BASE_BEAM_RADIUS = 3.2; // Raio base do feixe em pixels de tela

// Curva ease-out forte (Emil Kowalski) para expansão rápida e natural do pulso circular
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const LaserTrailOverlay: React.FC<LaserTrailOverlayProps> = ({
  currentTool,
  laserColor = DEFAULT_LASER_COLOR,
  localLaserPosRef,
  isLocalDrawingRef,
  localPointsRef,
  remoteUsers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const currentToolRef = useRef(currentTool);
  const laserColorRef = useRef(sanitizeLaserColor(laserColor));
  const remoteUsersRef = useRef(remoteUsers);

  // Anéis circulares de toque e intensidade suave (sem cruz geométrica)
  const pulseRingsRef = useRef<LaserPulseRing[]>([]);
  const lastDrawingStateRef = useRef<boolean>(false);
  const localPressIntensityRef = useRef<number>(0);
  const remoteLastDrawingMap = useRef<Map<string, boolean>>(new Map());
  const remotePressIntensityMap = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    laserColorRef.current = sanitizeLaserColor(laserColor);
  }, [laserColor]);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  const hasRemoteLaser = remoteUsers.some(
    (user) =>
      user.activeTool === 'laser' ||
      Boolean(user.laser?.isDrawing) ||
      Boolean(user.laser?.points?.length)
  );

  // Histórico persistente de rastros de colegas: userId -> LaserPoint[]
  const remoteTrailsRef = useRef<Map<string, LaserPoint[]>>(new Map());
  const lastHandledTimestamps = useRef<Map<string, number>>(new Map());

  // Atualiza histórico dos colegas preservando quebras e cores entre cliques distintos
  useEffect(() => {
    const now = Date.now();
    const trails = remoteTrailsRef.current;
    const handledMap = lastHandledTimestamps.current;
    const lastDrawingMap = remoteLastDrawingMap.current;

    remoteUsers.forEach((user) => {
      if (!user.laser) return;
      const { isDrawing, points, color, timestamp } = user.laser;
      const remoteBeamColor = sanitizeLaserColor(color);
      const lastHandled = handledMap.get(user.userId) || 0;

      const wasDrawing = lastDrawingMap.get(user.userId) || false;
      const startedNewStroke = Boolean(isDrawing && !wasDrawing);

      if (startedNewStroke && user.cursor) {
        pulseRingsRef.current.push({
          x: user.cursor.x,
          y: user.cursor.y,
          startTime: now,
          duration: 360,
          color: remoteBeamColor,
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
          const batchCount = points.length;
          const batchWindow = Math.min(80, Math.max(20, batchCount * 12));
          let markFirst = startedNewStroke;

          points.forEach(([px, py], idx) => {
            const last = userTrail[userTrail.length - 1];
            if (markFirst || !last || Math.hypot(px - last.x, py - last.y) >= 1.8) {
              const pointTime =
                now - batchWindow + (idx / Math.max(1, batchCount - 1)) * batchWindow;
              userTrail.push({
                x: px,
                y: py,
                timestamp: pointTime,
                color: remoteBeamColor,
                ...(markFirst ? { newStroke: true } : {}),
              });
              markFirst = false;
            }
          });
        } else if (isDrawing && user.cursor) {
          const last = userTrail[userTrail.length - 1];
          if (
            startedNewStroke ||
            !last ||
            Math.hypot(user.cursor.x - last.x, user.cursor.y - last.y) >= 1.8
          ) {
            userTrail.push({
              x: user.cursor.x,
              y: user.cursor.y,
              timestamp: now,
              color: remoteBeamColor,
              ...(startedNewStroke ? { newStroke: true } : {}),
            });
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
        remotePressIntensityMap.current.delete(id);
      }
    }
  }, [remoteUsers]);

  // Render loop 60/120fps nativo com fita vetorial contínua e óptica radial pura multicor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const idleFramesToStop = 12;
    let idleFrames = 0;
    let lastFramePerf = performance.now();

    let dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const syncCanvasSize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const hasActiveLaser = () => {
      if (currentToolRef.current === 'laser') return true;
      return remoteUsersRef.current.some(
        (user) => user.activeTool === 'laser' || Boolean(user.laser?.isDrawing)
      );
    };

    /**
     * Preenche uma camada contínua da fita afunilada sem costuras ou sobreposição de alpha
     */
    const fillRibbonLayer = (
      samples: readonly RibbonSample[],
      maxRadius: number,
      color: string,
      alpha: number
    ) => {
      if (samples.length < 2 || alpha <= 0.004 || maxRadius <= 0.02) return;
      const lastIdx = samples.length - 1;
      const head = samples[lastIdx];
      const headR = maxRadius * head.taper;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(samples[0].x, samples[0].y);

      for (let i = 1; i <= lastIdx; i++) {
        const s = samples[i];
        const r = maxRadius * s.taper;
        ctx.lineTo(s.x + s.nx * r, s.y + s.ny * r);
      }

      if (headR > 0.02) {
        const headAngle = Math.atan2(head.ny, head.nx);
        ctx.arc(head.x, head.y, headR, headAngle, headAngle - Math.PI, true);
      }

      for (let i = lastIdx - 1; i >= 1; i--) {
        const s = samples[i];
        const r = maxRadius * s.taper;
        ctx.lineTo(s.x - s.nx * r, s.y - s.ny * r);
      }

      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      if (!isRunning) return;

      const nowPerf = performance.now();
      const dt = Math.max(4, Math.min(50, nowPerf - lastFramePerf));
      lastFramePerf = nowPerf;
      const blendFactor = 1 - Math.exp(-dt / 55);

      const now = Date.now();
      const { x: stageX, y: stageY, scale } = getViewport();

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Transforma coordenadas para o espaço do Whiteboard (Pan & Zoom)
      ctx.translate(stageX, stageY);
      ctx.scale(scale, scale);

      let drewAnything = false;

      const isLocalDrawing = Boolean(isLocalDrawingRef.current);
      const localPos = localLaserPosRef.current;
      const activeLocalColor = laserColorRef.current;

      // Suavização contínua da intensidade óptica ao pressionar/soltar (sem saltos abruptos)
      const targetLocalIntensity =
        currentToolRef.current === 'laser' && isLocalDrawing ? 1 : 0;
      localPressIntensityRef.current +=
        (targetLocalIntensity - localPressIntensityRef.current) * blendFactor;
      if (localPressIntensityRef.current < 0.005) {
        localPressIntensityRef.current = 0;
      }

      // Dispara onda circular suave na cor ativa ao iniciar o clique do laser
      if (
        currentToolRef.current === 'laser' &&
        isLocalDrawing &&
        !lastDrawingStateRef.current &&
        localPos
      ) {
        pulseRingsRef.current.push({
          x: localPos.x,
          y: localPos.y,
          startTime: now,
          duration: 340,
          color: activeLocalColor,
        });
      }
      lastDrawingStateRef.current = isLocalDrawing;

      /**
       * Renderiza todos os traços ativos como fitas ópticas afuniladas em 4 camadas luminosas
       */
      const drawLaserStrokes = (
        rawPoints: readonly LaserPoint[],
        liveTip: { x: number; y: number } | null,
        activelyDrawing: boolean,
        fallbackColor: string
      ) => {
        if (!rawPoints || rawPoints.length === 0) return;

        const strokes = splitLaserStrokes(rawPoints, now, TRAIL_DURATION_MS, {
          minDist: 1.6 / scale,
          maxGapMs: 280,
          liveTip,
          isDrawing: activelyDrawing,
          activeColor: fallbackColor,
        });

        const baseRadius = BASE_BEAM_RADIUS / scale;
        const tailFeatherWorld = 22 / scale;
        const minSubdivWorld = 1.8 / scale;

        for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
          const stroke = strokes[sIdx];
          const smoothed = smoothLaserStroke(stroke, minSubdivWorld);
          const { samples, headProgress } = computeRibbonSamples(
            smoothed,
            now,
            TRAIL_DURATION_MS,
            tailFeatherWorld
          );
          if (samples.length < 2 || headProgress <= 0.01) continue;

          drewAnything = true;
          const fade = Math.pow(headProgress, 0.55);
          const palette = getLaserOpticalPalette(stroke[0]?.color || fallbackColor);

          // 1. Halo óptico externo difuso
          fillRibbonLayer(samples, baseRadius * 2.55, palette.hex, 0.18 * fade);
          // 2. Corona incandescente intermediária
          fillRibbonLayer(samples, baseRadius * 1.55, palette.coronaRgb, 0.38 * fade);
          // 3. Corpo saturado do feixe laser
          fillRibbonLayer(samples, baseRadius, palette.hex, 0.94 * fade);
          // 4. Núcleo branco incandescente
          fillRibbonLayer(samples, baseRadius * 0.42, '#ffffff', 0.98 * fade);
        }
      };

      /**
       * Desenha exclusivamente o ponto focal circular do diodo laser com bloom radial suave
       * (nunca desenha linhas em cruz '+' ao clicar ou arrastar)
       */
      const drawLaserPointerDot = (
        x: number,
        y: number,
        intensity: number,
        beamColor: string,
        userName?: string,
        userColor?: string
      ) => {
        const palette = getLaserOpticalPalette(beamColor);
        const breath = Math.sin(now / 170);
        const outerGlowRadius = (13.5 + 5.5 * intensity + 0.9 * breath) / scale;
        const contrastRimRadius = (5.5 + 1.15 * intensity) / scale;
        const coreRadius = (4.3 + 1.05 * intensity) / scale;
        const hotCenterRadius = (1.95 + 0.8 * intensity) / scale;

        // 1. Bloom radial contínuo na cor escolhida (sem bordas chapadas e sem cruz)
        ctx.save();
        const bloomGrad = ctx.createRadialGradient(x, y, 0, x, y, outerGlowRadius);
        bloomGrad.addColorStop(
          0,
          `rgba(${palette.r}, ${palette.g}, ${palette.b}, ${(0.44 + 0.26 * intensity).toFixed(3)})`
        );
        bloomGrad.addColorStop(
          0.45,
          `rgba(${palette.r}, ${palette.g}, ${palette.b}, ${(0.18 + 0.14 * intensity).toFixed(3)})`
        );
        bloomGrad.addColorStop(1, `rgba(${palette.r}, ${palette.g}, ${palette.b}, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, outerGlowRadius, 0, Math.PI * 2);
        ctx.fillStyle = bloomGrad;
        ctx.fill();
        ctx.restore();

        // 2. Anel sutil de contraste óptico (garante nitidez em fundos claros e escuros)
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, contrastRimRadius, 0, Math.PI * 2);
        ctx.fillStyle = palette.contrastRimRgba;
        ctx.fill();
        ctx.restore();

        // 3. Corpo saturado do ponto laser na cor escolhida
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = palette.hex;
        ctx.globalAlpha = 0.98;
        ctx.fill();
        ctx.restore();

        // 4. Centro branco incandescente puro
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, hotCenterRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.restore();

        // 5. Pílula discreta de identificação do colega (remoto)
        if (userName) {
          ctx.save();
          const fontSize = 11 / scale;
          ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
          const textMetrics = ctx.measureText(userName);
          const textW = textMetrics.width;
          const padX = 6 / scale;
          const tagH = 18 / scale;
          const tagW = textW + padX * 2 + 10 / scale;
          const tagX = x + 11 / scale;
          const tagY = y - 23 / scale;

          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, 9 / scale);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.strokeStyle = palette.hex;
          ctx.lineWidth = 1.2 / scale;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(tagX + padX + 3 / scale, tagY + tagH / 2, 2.5 / scale, 0, Math.PI * 2);
          ctx.fillStyle = userColor || palette.hex;
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(userName, tagX + padX + 8 / scale, tagY + tagH / 2 + 3.8 / scale);
          ctx.restore();
        }
      };

      // A. Ondas circulares sutis de foco ao clicar
      const activePulseRings: LaserPulseRing[] = [];
      pulseRingsRef.current.forEach((ring) => {
        const elapsed = now - ring.startTime;
        if (elapsed < ring.duration) {
          activePulseRings.push(ring);
          drewAnything = true;
          const p = elapsed / ring.duration;
          const eased = easeOutCubic(p);
          const radius = (5 + eased * 19) / scale;
          const ringAlpha = (1 - p) * 0.65;

          ctx.save();
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = ((1 - p * 0.55) * 1.8) / scale;
          ctx.globalAlpha = ringAlpha;
          ctx.stroke();
          ctx.restore();
        }
      });
      pulseRingsRef.current = activePulseRings;

      // B. Rastros e ponteiros dos colegas remotos
      const remoteTrails = remoteTrailsRef.current;
      const users = remoteUsersRef.current;
      users.forEach((user) => {
        const remoteDrawing = Boolean(user.laser?.isDrawing);
        const remoteBeamColor = sanitizeLaserColor(user.laser?.color);
        const prevRemoteIntensity = remotePressIntensityMap.current.get(user.userId) ?? 0;
        const nextRemoteIntensity =
          prevRemoteIntensity + ((remoteDrawing ? 1 : 0) - prevRemoteIntensity) * blendFactor;
        remotePressIntensityMap.current.set(
          user.userId,
          nextRemoteIntensity < 0.005 ? 0 : nextRemoteIntensity
        );

        const trail = remoteTrails.get(user.userId);
        if (trail && trail.length > 0) {
          const valid = trail.filter((p) => now - p.timestamp <= TRAIL_DURATION_MS);
          remoteTrails.set(user.userId, valid);
          if (valid.length > 0) {
            drewAnything = true;
            drawLaserStrokes(valid, user.cursor, remoteDrawing, remoteBeamColor);
          }
        }

        if (user.activeTool === 'laser' && user.cursor) {
          drewAnything = true;
          drawLaserPointerDot(
            user.cursor.x,
            user.cursor.y,
            nextRemoteIntensity,
            remoteBeamColor,
            user.name || 'Colega',
            user.color
          );
        }
      });

      // C. Rastro do usuário local
      const localPoints = localPointsRef.current;
      if (localPoints && localPoints.length > 0) {
        const validLocal = localPoints.filter((p) => now - p.timestamp <= TRAIL_DURATION_MS);
        localPointsRef.current = validLocal;
        if (validLocal.length > 0) {
          drewAnything = true;
          drawLaserStrokes(
            validLocal,
            currentToolRef.current === 'laser' ? localPos : null,
            currentToolRef.current === 'laser' && isLocalDrawing,
            activeLocalColor
          );
        }
      }

      // D. Ponto focal circular do usuário local
      if (currentToolRef.current === 'laser' && localPos) {
        drewAnything = true;
        drawLaserPointerDot(
          localPos.x,
          localPos.y,
          localPressIntensityRef.current,
          activeLocalColor
        );
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

    const hasPendingDecay =
      (localPointsRef.current?.length ?? 0) > 0 ||
      pulseRingsRef.current.length > 0 ||
      Array.from(remoteTrailsRef.current.values()).some((t) => t.length > 0);

    if (currentTool === 'laser' || hasRemoteLaser || hasPendingDecay) {
      rafId.current = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      window.removeEventListener('resize', syncCanvasSize);
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
