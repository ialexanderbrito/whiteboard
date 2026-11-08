import React, { useEffect, useState, useRef } from 'react';
import { reactionService, type GlobalReactionEvent } from '@/services/reactionService';
import { getAppleEmojiUrl } from '@/utils/appleEmoji';

interface ReactionParticle {
  id: string;
  emoji: string;
  startX: number;
  swayXPx: number;
  swayRotDeg: number;
  travelYPx: number;
  durationMs: number;
  swayDurationMs: number;
  delayMs: number;
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

export const GlobalReactionsOverlay: React.FC<GlobalReactionsOverlayProps> = ({ boardId }) => {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const [activeAuthor, setActiveAuthor] = useState<ReactionAuthorNotification | null>(null);
  const activeTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Pré-carregamento imediato das imagens Apple Emoji para resposta instantânea
  useEffect(() => {
    COMMON_EMOJIS.forEach((emoji) => {
      const img = new Image();
      img.src = getAppleEmojiUrl(emoji);
    });
  }, []);

  // Limpeza de timers ao desmontar
  useEffect(() => {
    const timers = activeTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = reactionService.subscribeReactions(boardId, (event: GlobalReactionEvent) => {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // 1. Notificação do autor da reação na parte inferior da tela
      if (event.userName && event.userName.trim() !== '') {
        const notif: ReactionAuthorNotification = {
          id: `author_${event.id}_${Date.now()}`,
          userName: event.userName,
          emoji: event.emoji,
          timestamp: Date.now(),
        };
        setActiveAuthor(notif);

        const notifTimer = setTimeout(() => {
          setActiveAuthor((current) => (current?.id === notif.id ? null : current));
          activeTimers.current.delete(notifTimer);
        }, 2600);
        activeTimers.current.add(notifTimer);
      }

      // 2. Dispersão das reações na TELA TODA (de baixo para cima)
      // Distribui 16 partículas ao longo de toda a largura do viewport (30px até a borda direita)
      const particleCount = 16;
      const margin = 40;
      const availableWidth = Math.max(300, windowWidth - margin * 2);
      const step = availableWidth / particleCount;
      const travelDist = windowHeight + 140;

      const newBatch: ReactionParticle[] = Array.from({ length: particleCount }).map((_, i) => {
        // Posição horizontal distribuída uniformemente por toda a tela com leve variação orgânica
        const baseLaneX = margin + i * step;
        const laneJitter = (Math.random() - 0.5) * (step * 0.85);
        const startX = Math.max(24, Math.min(windowWidth - 64, baseLaneX + laneJitter));

        const durationMs = 2800 + Math.random() * 800; // 2.8s a 3.6s para subida suave e graciosa
        const swayDurationMs = 1100 + Math.random() * 500;
        const swayXPx = 18 + Math.random() * 22;
        const swayRotDeg = 5 + Math.random() * 9;
        
        // Entrada em cascata/fluxo contínuo (stagger dinâmico)
        const delayMs = Math.floor(Math.random() * 450);
        // Variação de tamanho para gerar profundidade (alguns em primeiro plano, outros mais ao fundo)
        const sizePx = 36 + Math.floor(Math.random() * 20);

        return {
          id: `${event.id}_${i}_${Math.random()}`,
          emoji: event.emoji,
          startX,
          swayXPx: Math.random() > 0.5 ? swayXPx : -swayXPx,
          swayRotDeg: Math.random() > 0.5 ? swayRotDeg : -swayRotDeg,
          travelYPx: travelDist,
          durationMs,
          swayDurationMs,
          delayMs,
          sizePx,
        };
      });

      setParticles((prev) => [...prev, ...newBatch]);

      // Remove partículas da memória quando concluírem a subida
      const batchTimer = setTimeout(() => {
        const idsToRemove = new Set(newBatch.map((p) => p.id));
        setParticles((prev) => prev.filter((p) => !idsToRemove.has(p.id)));
        activeTimers.current.delete(batchTimer);
      }, 4200);
      activeTimers.current.add(batchTimer);
    });

    return unsubscribe;
  }, [boardId]);

  if (particles.length === 0 && !activeAuthor) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* 1. Badge sutil do autor da reação na base inferior central da tela */}
      {activeAuthor && (
        <div
          key={activeAuthor.id}
          className="absolute bottom-6 left-1/2 z-20 will-change-transform pointer-events-none"
          style={{
            animation: 'reaction-badge-in 2400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/95 text-foreground border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl text-xs font-semibold whitespace-nowrap">
            <span className="text-muted-foreground font-medium">{activeAuthor.userName} reagiu com</span>
            <span className="text-base leading-none">{activeAuthor.emoji}</span>
          </div>
        </div>
      )}

      {/* 2. Erupção de Partículas Flutuantes na Tela Toda (De baixo para cima) */}
      {particles.map((p) => {
        const appleUrl = getAppleEmojiUrl(p.emoji);

        return (
          /* Tier 1: Eixo Vertical Contínuo (Sobe de bottom: -40px até o topo da viewport) */
          <div
            key={p.id}
            className="absolute bottom-[-40px] will-change-transform pointer-events-none"
            style={
              {
                left: `${p.startX}px`,
                '--rise-travel': `-${p.travelYPx}px`,
                animation: `reaction-rise ${p.durationMs}ms cubic-bezier(0.12, 0.72, 0.28, 1) ${p.delayMs}ms forwards`,
              } as React.CSSProperties
            }
          >
            {/* Tier 2: Eixo Horizontal e Rotação Desacoplados (Harmonic Sway contínuo) */}
            <div
              className="will-change-transform pointer-events-none"
              style={
                {
                  '--sway-x': `${p.swayXPx}px`,
                  '--sway-rot': `${p.swayRotDeg}deg`,
                  animation: `reaction-sway ${p.swayDurationMs}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) ${p.delayMs}ms infinite alternate`,
                } as React.CSSProperties
              }
            >
              {/* Tier 3: Elemento Visual com Pop Suave e Sombra de Profundidade */}
              <div
                className="flex items-center justify-center will-change-transform drop-shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                style={{
                  width: `${p.sizePx}px`,
                  height: `${p.sizePx}px`,
                  animation: `reaction-pop ${p.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${p.delayMs}ms forwards`,
                }}
              >
                <img
                  src={appleUrl}
                  alt={p.emoji}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  loading="eager"
                  onError={(e) => {
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerText = p.emoji;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
