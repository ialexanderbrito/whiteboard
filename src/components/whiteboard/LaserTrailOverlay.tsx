import React, { useEffect, useRef } from 'react';
import type { UserPresence, CurrentUser } from '../../types/board';
import type { ToolType } from '../../types/element';
import { getViewport } from '../../utils/viewport';

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
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
const TRAIL_DURATION_MS = 1000; // 1s de cauda dinâmica ágil (Miro/FigJam/Keynote)
const BASE_STROKE_WIDTH = 5.5; // Espessura base do feixe

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

  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  // Boolean (not the array) so remote cursor updates don't restart the loop,
  // but a colleague entering/leaving laser mode does.
  const hasRemoteLaser = remoteUsers.some(
    (user) =>
      user.activeTool === 'laser' ||
      Boolean(user.laser?.isDrawing) ||
      Boolean(user.laser?.points?.length)
  );

  // Mapeamento persistente de rastros de usuários remotos: userId -> LaserPoint[]
  const remoteTrailsRef = useRef<Map<string, LaserPoint[]>>(new Map());
  const lastHandledTimestamps = useRef<Map<string, number>>(new Map());

  // Atualiza histórico dos colegas conforme novas coordenadas chegam da rede
  useEffect(() => {
    const now = Date.now();
    const trails = remoteTrailsRef.current;
    const handledMap = lastHandledTimestamps.current;

    remoteUsers.forEach((user) => {
      if (!user.laser) return;
      const { isDrawing, points, timestamp } = user.laser;
      const lastHandled = handledMap.get(user.userId) || 0;

      if (timestamp && timestamp !== lastHandled) {
        handledMap.set(user.userId, timestamp);

        if (!trails.has(user.userId)) {
          trails.set(user.userId, []);
        }
        const userTrail = trails.get(user.userId)!;

        if (points && points.length > 0) {
          points.forEach(([px, py]) => {
            const last = userTrail[userTrail.length - 1];
            if (!last || Math.hypot(px - last.x, py - last.y) >= 2.5) {
              userTrail.push({ x: px, y: py, timestamp: now });
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
      }
    }
  }, [remoteUsers]);

  // Render loop 60/120fps nativo com interpolação Bézier contínua (SEM NENHUM PONTO OU EMENDA)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const idleFramesToStop = 8;
    let idleFrames = 0;

    const hasActiveLaser = () => {
      if (currentToolRef.current === 'laser') return true;
      return remoteUsersRef.current.some(
        (user) => user.activeTool === 'laser' || Boolean(user.laser?.isDrawing)
      );
    };

    const render = () => {
      if (!isRunning) return;

      const now = Date.now();
      const { x: stageX, y: stageY, scale } = getViewport();
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Transforma coordenadas para o espaço do Whiteboard (Pan & Zoom)
      ctx.translate(stageX, stageY);
      ctx.scale(scale, scale);

      /**
       * Desenha o rastro do laser contínuo e fluído sem sobreposição de pontas redondas
       * Usa curvas quadráticas Bézier contínuas através de pontos médios divididas em blocos suaves.
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

        // 2. Divide a trajetória em blocos suaves contínuos (chunking)
        // Cada bloco é desenhado em uma única chamada de stroke() para nunca criar "bolinhas" nas emendas
        const CHUNK_SIZE = 4; // 4 pontos por segmento de curva suave
        const numPoints = valid.length;

        for (let i = 0; i < numPoints - 1; i += CHUNK_SIZE - 1) {
          const endIdx = Math.min(i + CHUNK_SIZE, numPoints);
          const chunk = valid.slice(i, endIdx);
          if (chunk.length < 2) continue;

          // Idade e progresso do bloco (0 = cauda antiga desvanecida, 1 = ponta nova)
          const midPoint = chunk[Math.floor(chunk.length / 2)];
          const age = now - midPoint.timestamp;
          const progress = Math.max(0.04, Math.min(1, 1 - age / TRAIL_DURATION_MS));

          // Easing orgânico para cauda afunilada elegante
          const opacity = Math.pow(progress, 1.25);
          const strokeW = Math.max(1.8, (BASE_STROKE_WIDTH * (0.2 + 0.8 * progress)) / scale);
          const isFirstChunk = (i === 0);

          // Função para desenhar a curva Bézier contínua do bloco
          const drawSmoothSpline = (
            strokeStyle: string, 
            lineWidth: number, 
            alpha: number, 
            shadowBlur: number
          ) => {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            // Apenas o início da cauda mais antiga recebe ponta redonda;
            // as emendas internas usam 'butt' para NÃO sobrepor círculos (elimina as bolinhas!)
            ctx.lineCap = isFirstChunk ? 'round' : 'butt';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = alpha;

            if (shadowBlur > 0) {
              ctx.shadowColor = LASER_COLOR;
              ctx.shadowBlur = shadowBlur;
            }

            ctx.moveTo(chunk[0].x, chunk[0].y);
            for (let j = 0; j < chunk.length - 1; j++) {
              const pCurr = chunk[j];
              const pNext = chunk[j + 1];
              const midX = (pCurr.x + pNext.x) / 2;
              const midY = (pCurr.y + pNext.y) / 2;
              ctx.quadraticCurveTo(pCurr.x, pCurr.y, midX, midY);
            }
            ctx.lineTo(chunk[chunk.length - 1].x, chunk[chunk.length - 1].y);
            ctx.stroke();
            ctx.restore();
          };

          // Camada 1: Halo Neon Vermelho Radiante com Bloom
          drawSmoothSpline(LASER_COLOR, strokeW * 2.2, opacity * 0.45, (16 * progress) / scale);

          // Camada 2: Feixe Vermelho Laser Intenso
          drawSmoothSpline(LASER_COLOR, strokeW, opacity * 0.95, 0);

          // Camada 3: Núcleo Branco Incandescente (Hot-white Center)
          drawSmoothSpline('#ffffff', Math.max(0.8, strokeW * 0.35), opacity * 0.95, 0);
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
        const haloRadius = Math.max(5, (8 + (isDrawing ? 3 : 1.5) * pulse) / scale);
        const coreRadius = Math.max(2.5, 4.2 / scale);
        const centerWhite = Math.max(1.2, 2.2 / scale);

        // 1. Halo Difuso Pulsante
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = LASER_COLOR;
        ctx.shadowColor = LASER_COLOR;
        ctx.shadowBlur = (20 / scale);
        ctx.globalAlpha = isDrawing ? 0.6 : 0.35;
        ctx.fill();
        ctx.restore();

        // 2. Anel de Brilho Vermelho Sólido
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = LASER_COLOR;
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

        // 4. Lens Flare óptico (cruz luminosa delicada na ponta do feixe ao desenhar)
        if (isDrawing) {
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.8, 1.2 / scale);
          ctx.globalAlpha = 0.85;
          const flareLen = Math.max(6, 11 / scale);

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

          // Fundo translúcido com borda suave
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, 8 / scale);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.strokeStyle = userColor || LASER_COLOR;
          ctx.lineWidth = Math.max(1, 1.2 / scale);
          ctx.stroke();

          // Ponto com a cor do perfil do colega
          ctx.beginPath();
          ctx.arc(tagX + padX + 3 / scale, tagY + tagH / 2, 2.5 / scale, 0, Math.PI * 2);
          ctx.fillStyle = userColor || '#3b82f6';
          ctx.fill();

          // Nome do colega
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, tagX + padX + 8 / scale, tagY + tagH / 2 + 3.5 / scale);
          ctx.restore();
        }
      };

      // A. Desenha os rastros e ponteiros dos colegas remotos (Vermelho Laser + Tag de Identificação)
      const remoteTrails = remoteTrailsRef.current;
      const users = remoteUsersRef.current;
      let drewAnything = false;
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

      // B. Desenha o rastro do usuário local (Vermelho Laser Contínuo)
      const localPoints = localPointsRef.current;
      if (localPoints && localPoints.length > 0) {
        const validLocal = localPoints.filter((p) => now - p.timestamp <= TRAIL_DURATION_MS);
        localPointsRef.current = validLocal;
        if (validLocal.length > 0) drewAnything = true;
        drawLaserTrail(validLocal);
      }

      // C. Desenha o ponto focal do laser do usuário local
      const localLaserPos = localLaserPosRef.current;
      const isLocalDrawing = Boolean(isLocalDrawingRef.current);
      if (currentToolRef.current === 'laser' && localLaserPos) {
        drewAnything = true;
        drawLaserPointerDot(localLaserPos.x, localLaserPos.y, isLocalDrawing);
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
