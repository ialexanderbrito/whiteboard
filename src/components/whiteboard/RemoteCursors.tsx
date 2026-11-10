import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { UserPresence } from '../../types/board';
import { Pen, StickyNote, Eraser, Type, Square, Hand, Laser } from '@/components/ui/icons';
import { getViewport, subscribeViewport } from '../../utils/viewport';

interface RemoteCursorsProps {
  remoteUsers: UserPresence[];
}

// Ícone miniatura representando a ferramenta ativa do colega
const getToolMiniIcon = (tool?: string | null) => {
  if (!tool) return null;
  const size = "size-2.5";
  switch (tool) {
    case 'pen':
    case 'highlighter':
      return <Pen className={size} />;
    case 'sticky':
      return <StickyNote className={size} />;
    case 'eraser':
      return <Eraser className={size} />;
    case 'text':
      return <Type className={size} />;
    case 'rect':
    case 'circle':
    case 'diamond':
    case 'star':
    case 'triangle':
      return <Square className={size} />;
    case 'pan':
      return <Hand className={size} />;
    case 'laser':
      return <Laser className={size} />;
    default:
      return null;
  }
};

interface CursorItemProps {
  user: UserPresence;
  /** Cursor position in board (world) coordinates. */
  worldX: number;
  worldY: number;
}

const RemoteCursorItem: React.FC<CursorItemProps> = React.memo(({
  user,
  worldX,
  worldY,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPos = useRef({ x: worldX, y: worldY });
  const targetPos = useRef({ x: worldX, y: worldY });
  const tilt = useRef(0);
  const rafId = useRef<number | null>(null);
  const isRunning = useRef(false);

  // Estados de animação e presença
  const [clickRipples, setClickRipples] = useState<{ id: string; timestamp: number }[]>([]);
  const lastHandledClick = useRef<number | null>(null);
  const lastTargetUpdate = useRef(Date.now());

  // Atualiza coordenadas-alvo
  useEffect(() => {
    targetPos.current = { x: worldX, y: worldY };
    lastTargetUpdate.current = Date.now();

    // Inicia loop de física e interpolação se não estiver rodando
    if (!isRunning.current) {
      startLoop();
    }
  }, [worldX, worldY]);

  // Efeito de pulso de clique (quando o usuário remoto clica no board)
  useEffect(() => {
    const ts = user.lastClickTimestamp;
    if (!ts) return;

    // Ignora cliques antigos (> 1200ms) ou já disparados neste cursor para evitar chaves duplicadas
    if (lastHandledClick.current === ts || Date.now() - ts > 1200) {
      return;
    }
    lastHandledClick.current = ts;

    const rippleId = `${ts}_${Math.random().toString(36).substring(2, 9)}`;
    setClickRipples((prev) => [...prev.slice(-2), { id: rippleId, timestamp: ts }]);

    const timer = setTimeout(() => {
      setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 500);

    return () => clearTimeout(timer);
  }, [user.lastClickTimestamp]);

  // Loop de Interpolação Lerp Suave (60/120/144fps sem travar a thread de render do React)
  const startLoop = () => {
    isRunning.current = true;

    const animate = () => {
      const dx = targetPos.current.x - currentPos.current.x;
      const dy = targetPos.current.y - currentPos.current.y;

      // Fator de amortecimento calibrado para sensação táctil e zero atraso (Emil Kowalski guidelines)
      const factor = 0.32;
      currentPos.current.x += dx * factor;
      currentPos.current.y += dy * factor;

      // Inclinação dinâmica em curvas (Inertial Dynamic Tilt)
      // Quando se move para os lados, o cursor inclina suavemente até 14 graus
      const targetTilt = Math.max(-14, Math.min(14, dx * 0.16));
      tilt.current += (targetTilt - tilt.current) * 0.22;

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${currentPos.current.x.toFixed(1)}px, ${currentPos.current.y.toFixed(1)}px, 0)`;
      }

      // Se a distância for insignificante e a inclinação estabilizou, descansa a CPU
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(tilt.current) < 0.1) {
        currentPos.current.x = targetPos.current.x;
        currentPos.current.y = targetPos.current.y;
        tilt.current = 0;
        if (containerRef.current) {
          containerRef.current.style.transform = `translate3d(${targetPos.current.x.toFixed(1)}px, ${targetPos.current.y.toFixed(1)}px, 0)`;
        }
        isRunning.current = false;
        rafId.current = null;
        return;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    startLoop();
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Mensagem recente de Cursor Chat (confere se há mensagem ativa e não-expirada)
  const isMessageVisible = Boolean(user.message && user.message.trim());
  const isStale = user.messageTimestamp ? (Date.now() - user.messageTimestamp > 15000) : false;
  const showMessage = isMessageVisible && !isStale;
  const isOnlyEmoji = user.message && /^(\p{Extended_Pictographic}|\s)+$/u.test(user.message.trim());

  // Opacidade reduzida se o usuário estiver ausente há mais de 25s
  const isInactive = Date.now() - user.lastSeen > 25000;

  return (
    <div
      ref={containerRef}
      className={`absolute top-0 left-0 will-change-transform pointer-events-none z-30 transition-opacity duration-300 ${
        isInactive ? 'opacity-40' : 'opacity-100'
      }`}
      style={{
        transform: `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`,
      }}
    >
      {/* Counter-scale: o wrapper do board aplica o zoom; o cursor permanece do mesmo tamanho. */}
      <div
        className="origin-top-left"
        style={{ transform: 'scale(var(--mirio-cursor-inv-scale, 1))' }}
      >
      {/* Ondas concêntricas de clique (Click Ripple) */}
      {clickRipples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute top-0 left-0 size-7 rounded-full border-2 animate-cursor-ripple pointer-events-none"
          style={{
            borderColor: user.color || '#3b82f6',
            backgroundColor: `${user.color || '#3b82f6'}22`,
          }}
        />
      ))}

      {/* Flecha do Cursor Estilo Figma / Miro de Alta Precisão */}
      <div 
        className="relative transition-transform duration-75 ease-out origin-top-left"
        style={{ transform: `rotate(${tilt.current.toFixed(1)}deg)` }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)]"
        >
          <path
            d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
            fill={user.color}
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Tag do Usuário Sempre com Nome Completo Visível */}
        <div
          className="absolute left-3.5 top-3 flex items-center px-2 py-0.5 rounded-full gap-1.5 select-none shadow-[0_2px_8px_rgba(0,0,0,0.22)] whitespace-nowrap"
          style={{
            backgroundColor: user.color || '#3b82f6',
            border: '1.2px solid rgba(255, 255, 255, 0.45)',
          }}
        >
          {/* Avatar com foto de perfil se for usuário Google, ou ícone de ferramenta ativa */}
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name || 'Colega'}
              referrerPolicy="no-referrer"
              className="size-3.5 rounded-full object-cover shrink-0 ring-1 ring-white/60"
            />
          ) : (
            user.activeTool && getToolMiniIcon(user.activeTool) && (
              <span className="text-white/80 shrink-0">
                {getToolMiniIcon(user.activeTool)}
              </span>
            )
          )}
          {/* Nome do Colega */}
          <span className="text-[11px] font-medium text-white tracking-tight whitespace-nowrap leading-none drop-shadow-xs">
            {user.name || 'Colega'}
          </span>
        </div>
      </div>

      {/* Balão Flutuante de Cursor Chat (Estilo Figma) - Nivelado horizontalmente e com largura fluida */}
      {showMessage && (
        <div className="absolute left-5 top-8 animate-cursor-bubble origin-top-left pointer-events-none z-40 w-max max-w-[320px]">
          {isOnlyEmoji ? (
            <div className="text-3xl filter drop-shadow-md select-none transform hover:scale-110 transition-transform">
              {user.message}
            </div>
          ) : (
            <div className="relative bg-card/95 dark:bg-card/95 text-foreground px-3.5 py-1.5 rounded-2xl rounded-tl-xs border border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md w-max max-w-[320px] text-xs font-medium leading-relaxed whitespace-normal break-words">
              {user.message}
              {/* Rabicho do balão */}
              <div 
                className="absolute -top-1.5 left-2 size-2.5 bg-card/95 border-l border-t border-border/80 rotate-45"
              />
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
});

RemoteCursorItem.displayName = 'RemoteCursorItem';

export const RemoteCursors: React.FC<RemoteCursorsProps> = React.memo(({
  remoteUsers,
}) => {
  const worldLayerRef = useRef<HTMLDivElement>(null);

  // O pan/zoom move apenas este wrapper (world -> screen). Os cursores ficam em
  // coordenadas do quadro e são contra-escalados, sem re-render do React.
  useLayoutEffect(() => {
    const place = (viewport: { x: number; y: number; scale: number }) => {
      const node = worldLayerRef.current;
      if (!node) return;
      node.style.transform = `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`;
      node.style.setProperty('--mirio-cursor-inv-scale', String(1 / viewport.scale));
    };
    place(getViewport());
    return subscribeViewport(place);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <div
        ref={worldLayerRef}
        className="absolute top-0 left-0 origin-top-left will-change-transform"
      >
        {remoteUsers.map((user, index) => {
          if (!user.cursor) return null;

          // Se o usuário remoto estiver usando a ferramenta laser, o feixe neon e o ponto focal
          // com o nome dele já são desenhados com brilho em LaserTrailOverlay.
          // Ocultamos a seta comum para evitar sobreposição dupla de cursores.
          if (user.activeTool === 'laser') return null;

          return (
            <RemoteCursorItem
              key={user.userId || `remote-cursor-${index}`}
              user={user}
              worldX={user.cursor.x}
              worldY={user.cursor.y}
            />
          );
        })}
      </div>
    </div>
  );
});

RemoteCursors.displayName = 'RemoteCursors';
