import React, { useState, useRef, useCallback } from 'react';
import {
  MousePointer,
  StickyNote,
  Square,
  Pen,
  Type,
  ArrowUpRight,
  Smile,
  Layers,
  ZoomIn,
  ZoomOut,
  User,
} from '@/components/ui/icons';
import { playReactionPopSound } from '@/utils/audioChime';

interface ReactionParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

interface InviteBoardShowcaseProps {
  /** Nome REAL do anfitrião (dono do quadro) exibido no cursor e no dock */
  hostName?: string;
  /** Título REAL do quadro compartilhado exibido no frame */
  boardTitle?: string;
  /** ID do quadro compartilhado exibido no frame */
  boardId?: string;
}

/**
 * Vitrine interativa da tela de convite — propositalmente DIFERENTE da vitrine
 * de login: aqui não é uma retrospectiva fictícia, é a SALA REAL DO CONVITE.
 * O anfitrião é o dono real do quadro (quando disponível), acompanhado de
 * Marina e Pedro preparando a agenda da reunião. Post-its com ações novas
 * (aceno 👋 e check ✅), vaga fantasma no dock e cursor "Você" seguindo o mouse.
 */
export const InviteBoardShowcase: React.FC<InviteBoardShowcaseProps> = ({
  hostName,
  boardTitle,
  boardId,
}) => {
  const [activeTool, setActiveTool] = useState<'select' | 'sticky' | 'shape' | 'pen' | 'text' | 'arrow' | 'reaction'>('select');

  // Reações interativas dos post-its da sala (ações diferentes das da vitrine de login)
  const [sticky1Reactions, setSticky1Reactions] = useState<{ wave: number }>({ wave: 4 });
  const [sticky2Reactions, setSticky2Reactions] = useState<{ check: number }>({ check: 2 });

  // Partículas flutuantes disparadas no clique
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const particleIdRef = useRef(0);

  // Rastreamento do mouse do convidado (cursor "Você")
  const stageRef = useRef<HTMLDivElement>(null);
  const [userPointer, setUserPointer] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  const hostLabel = hostName?.trim() || 'Anfitrião';
  const hostInitial = hostLabel.charAt(0).toUpperCase();

  const triggerReaction = (e: React.MouseEvent, type: 'wave' | 'check', emoji: string) => {
    e.stopPropagation();
    playReactionPopSound();

    if (type === 'wave') setSticky1Reactions((prev) => ({ ...prev, wave: prev.wave + 1 }));
    if (type === 'check') setSticky2Reactions((prev) => ({ ...prev, check: prev.check + 1 }));

    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) {
      const newParticle = { id: ++particleIdRef.current, emoji, x: e.clientX - rect.left, y: e.clientY - rect.top };
      setParticles((prev) => [...prev, newParticle]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
      }, 700);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setUserPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setUserPointer((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-xs select-none overflow-hidden h-[330px] sm:h-[355px] flex flex-col justify-between transition-colors"
      style={{ cursor: userPointer.visible ? 'crosshair' : 'default' }}
      aria-label="Demonstração interativa da sala do quadro compartilhado esperando você entrar"
    >
      {/* 1. Canvas Grid Arquitetural de Pontos do Mirio */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(#e4e4e7_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#27272a_1.2px,transparent_1.2px)] [background-size:22px_22px] opacity-80"
      />

      {/* 2. Mini Barra de Ferramentas Real do Whiteboard */}
      <div className="relative z-20 flex items-center justify-center pt-2.5 sm:pt-3 px-3 pointer-events-auto">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background/90 px-1.5 py-0.5 shadow-xs backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'select'
                ? 'bg-foreground text-background shadow-2xs font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Selecionar / Mover (V)"
          >
            <MousePointer className="size-3" />
          </button>

          <div className="h-3.5 w-px bg-border/60 mx-0.5" />

          <button
            type="button"
            onClick={() => setActiveTool('sticky')}
            className={`relative flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'sticky'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Nota Adesiva / Post-it (S)"
          >
            <StickyNote className="size-3" />
            <span className="absolute bottom-1 right-1 size-1 rounded-full bg-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('shape')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'shape'
                ? 'bg-foreground text-background shadow-2xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Formas Geométricas (R)"
          >
            <Square className="size-3" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'pen'
                ? 'bg-foreground text-background shadow-2xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Caneta & Desenho Livre (P)"
          >
            <Pen className="size-3" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'text'
                ? 'bg-foreground text-background shadow-2xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Caixa de Texto (T)"
          >
            <Type className="size-3" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('arrow')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'arrow'
                ? 'bg-foreground text-background shadow-2xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Conector / Seta (C)"
          >
            <ArrowUpRight className="size-3" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('reaction')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'reaction'
                ? 'bg-foreground text-background shadow-2xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Reações & Emojis (E)"
          >
            <Smile className="size-3" />
          </button>
        </div>
      </div>

      {/* 3. Área de Conteúdo do Canvas (a sala real do convite) */}
      <div className="relative z-10 flex-1 w-full px-2 sm:px-4 py-1 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="relative w-full max-w-2xl h-[235px] sm:h-[250px]">

          {/* FRAME: a sala aberta do quadro (título real quando disponível) */}
          <div className="absolute inset-x-0 top-0 bottom-0 rounded-xl border border-border/80 bg-background/40 backdrop-blur-[2px] p-2.5 flex flex-col justify-between">
            {/* Header do Frame */}
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="size-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-semibold text-foreground tracking-tight truncate max-w-[180px]">
                  {boardTitle ? `Sala: ${boardTitle}` : 'Sala aberta do quadro'}
                </span>
                {boardId && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground shrink-0">
                    #b/{boardId}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                3 na sala • 1 vaga
              </span>
            </div>

            {/* Rodapé interno do Frame */}
            <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/40">
              <span>5 post-its • 1 agenda • 1 fluxo</span>
              <span className="text-foreground font-medium">sala aberta • sincronizada</span>
            </div>
          </div>

          {/* SVG DE CONECTOR: do post-it de chegada até a vaga "Você" */}
          <svg
            className="absolute inset-0 pointer-events-none w-full h-full z-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker
                id="invite-arrow-head"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--muted-foreground))" opacity="0.7" />
              </marker>
            </defs>
            <path
              d="M 205 105 C 260 115, 250 170, 295 185"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              strokeOpacity="0.6"
              markerEnd="url(#invite-arrow-head)"
              className="animate-invite-dash-flow"
            />
          </svg>

          {/* TAG FLUTUANTE NA LINHA CONECTORA */}
          <div className="absolute left-[248px] top-[122px] z-15 -translate-x-1/2 hidden sm:block pointer-events-none">
            <span className="rounded-full border border-border/80 bg-background/90 px-2 py-0.5 text-[9px] font-mono text-muted-foreground shadow-2xs backdrop-blur-xs whitespace-nowrap">
              seu lugar ➔
            </span>
          </div>

          {/* =========================================================================
              POST-IT REAL 1: Pêssego Mirio (#ffedd5) — Chegada do convidado
             ========================================================================= */}
          <div
            className="absolute left-1.5 sm:left-3 top-5 w-44 sm:w-52 rounded-xl p-2.5 shadow-md select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border border-orange-300/80 z-15"
            style={{
              backgroundColor: '#ffedd5',
              color: '#7c2d12',
              transform: 'rotate(-1.8deg)',
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-orange-300/60 text-[9px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-orange-500" />
                <span>Chegada</span>
              </span>
              <span className="font-mono text-[8px] opacity-75">#sala</span>
            </div>

            <p className="pt-1.5 text-[11px] font-medium leading-snug">
              A sala já tá rolando. Entra e aparece com seu cursor!
            </p>

            <div className="pt-1.5 mt-1 flex items-center justify-between border-t border-orange-300/50 text-[9px]">
              <span className="font-medium opacity-85 truncate max-w-[90px]">{hostLabel}</span>

              <button
                type="button"
                onClick={(e) => triggerReaction(e, 'wave', '👋')}
                className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                title="Acenar de boas-vindas"
              >
                <span>👋</span>
                <span>{sticky1Reactions.wave}</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              POST-IT REAL 2: Lilás Mirio (#f3e8ff) — Agenda da reunião
             ========================================================================= */}
          <div
            className="absolute right-1.5 sm:right-3 top-4 w-44 sm:w-50 rounded-xl p-2.5 shadow-md select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border border-purple-300/80 z-15"
            style={{
              backgroundColor: '#f3e8ff',
              color: '#581c87',
              transform: 'rotate(1.6deg)',
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-purple-300/60 text-[9px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-purple-500" />
                <span>Agenda</span>
              </span>
              <span className="font-mono text-[8px] opacity-75">#kickoff</span>
            </div>

            <p className="pt-1.5 text-[11px] font-medium leading-snug">
              Fechamos os tópicos da reunião. Confere e marca o que falta.
            </p>

            <div className="pt-1.5 mt-1 flex items-center justify-between border-t border-purple-300/50 text-[9px]">
              <span className="font-medium opacity-85">Marina T.</span>

              <button
                type="button"
                onClick={(e) => triggerReaction(e, 'check', '✅')}
                className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                title="Marcar tópico como feito"
              >
                <span>✅</span>
                <span>{sticky2Reactions.check}</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              VAGA FANTASMA: o lugar do convidado (Você) na sala
             ========================================================================= */}
          <div className="group absolute left-1/2 -translate-x-1/2 bottom-2 w-44 sm:w-50 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 backdrop-blur-[2px] p-2.5 z-15 hover:border-indigo-400/60 transition-colors duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-dashed border-border/60 text-[9px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="size-3" />
                <span>Sua vaga</span>
              </span>
              <span className="font-mono px-1.5 py-0.2 rounded border border-indigo-400/40 bg-indigo-500/10 text-indigo-500 text-[8px]">
                LIVRE
              </span>
            </div>

            <div className="py-2 flex items-center justify-center gap-2.5">
              {/* Avatar fantasma "Você" */}
              <span className="size-8 rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground/50 flex items-center justify-center text-xs font-bold transition-transform duration-200 group-hover:scale-110 group-hover:border-indigo-400/60 group-hover:text-indigo-500">
                ?
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-foreground leading-tight">Você entra aqui</span>
                <span className="text-[9px] text-muted-foreground leading-snug">
                  cursor, post-its e reações<br />liberados na hora
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground border-t border-dashed border-border/50 pt-1">
              <span>SEAT_GUEST</span>
              <span>1 disponível</span>
            </div>
          </div>

          {/* =========================================================================
              CURSORES DA SALA: anfitrião REAL + Marina + Pedro (nomes e ações próprios)
             ========================================================================= */}

          {/* CURSOR 1: Anfitrião (Índigo #6366f1) — dando as boas-vindas */}
          <div
            className="animate-login-cursor-sofia absolute left-12 top-10 pointer-events-none will-change-transform z-30"
          >
            <span className="animate-login-ripple-sofia absolute -top-1.5 -left-1.5 size-7 rounded-full border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none" />

            <div className="relative origin-top-left">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              >
                <path
                  d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                className="absolute left-3.5 top-3 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor: '#6366f1',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <StickyNote className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none max-w-[120px] truncate">
                  {hostLabel}
                </span>
              </div>

              <div className="animate-login-chat-sofia absolute left-4 -top-8 origin-bottom-left z-40 pointer-events-none">
                <div className="relative bg-card text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1.5">
                  <span>Fechou, te esperei!</span>
                  <span>👋</span>
                  <div className="absolute -bottom-1 left-2 size-2 bg-card border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* CURSOR 2: Marina T. (Esmeralda #10b981) — fechando a agenda */}
          <div
            className="animate-login-cursor-lucas absolute right-16 top-16 pointer-events-none will-change-transform z-30"
          >
            <span className="animate-login-ripple-lucas absolute -top-1.5 -left-1.5 size-7 rounded-full border-2 border-emerald-500 bg-emerald-500/20 pointer-events-none" />

            <div className="relative origin-top-left">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              >
                <path
                  d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                className="absolute left-3.5 top-3 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor: '#10b981',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <Type className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Marina T.
                </span>
              </div>

              <div className="animate-login-chat-lucas absolute left-4 -top-8 origin-bottom-left z-40 pointer-events-none">
                <div className="relative bg-card text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1.5">
                  <span>Falta só seu check</span>
                  <span>😄</span>
                  <div className="absolute -bottom-1 left-2 size-2 bg-card border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* CURSOR 3: Pedro A. (Rosa #f43f5e) — desenhando o fluxo */}
          <div
            className="animate-login-cursor-camila absolute left-40 bottom-8 pointer-events-none will-change-transform z-30"
          >
            <span className="animate-login-ripple-camila absolute -top-1.5 -left-1.5 size-7 rounded-full border-2 border-rose-500 bg-rose-500/20 pointer-events-none" />

            <div className="relative origin-top-left">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              >
                <path
                  d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                className="absolute left-3.5 top-3 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor: '#f43f5e',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <Pen className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Pedro A.
                </span>
              </div>

              <div className="animate-login-chat-camila absolute left-4 -top-8 origin-bottom-left z-40 pointer-events-none">
                <div className="relative bg-card text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1.5">
                  <span>Desenhando o fluxo aqui</span>
                  <span>🎨</span>
                  <div className="absolute -bottom-1 left-2 size-2 bg-card border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* CURSOR INTERATIVO DO CONVIDADO ("Você") */}
          {userPointer.visible && (
            <div
              className="absolute pointer-events-none will-change-transform z-50 transition-opacity duration-150"
              style={{
                left: `${userPointer.x}px`,
                top: `${userPointer.y}px`,
                transform: 'translate3d(0, 0, 0)',
              }}
            >
              <div className="relative origin-top-left">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                >
                  <path
                    d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div
                  className="absolute left-3.5 top-3 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                  style={{
                    backgroundColor: '#2563eb',
                    border: '1px solid rgba(255, 255, 255, 0.45)',
                  }}
                >
                  <span className="size-1.5 rounded-full bg-white" />
                  <span className="text-[9px] font-medium text-white tracking-tight leading-none">
                    Você
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PARTÍCULAS DE REAÇÃO */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="animate-local-reaction-pop absolute z-50 pointer-events-none text-xl"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
              }}
            >
              {particle.emoji}
            </div>
          ))}

        </div>
      </div>

      {/* 4. Controles do Rodapé do Canvas (Dock de Colaboradores com a Vaga Fantasma) */}
      <div className="relative z-20 flex items-center justify-between px-3 sm:px-4 py-1.5 border-t border-border/40 bg-background/50 text-[10px] font-mono text-muted-foreground backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px]">
            <ZoomOut className="size-2.5 mr-1 opacity-70" />
            <span className="font-semibold text-foreground">100%</span>
            <ZoomIn className="size-2.5 ml-1 opacity-70" />
          </div>
          <span className="hidden sm:inline-block text-[10px]">Sala compartilhada</span>
        </div>

        {/* Dock de Colaboradores: anfitrião REAL, Marina, Pedro e a vaga fantasma do convidado */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5">
            <span className="size-5 rounded-full bg-indigo-500 border border-background text-[9px] font-bold text-white flex items-center justify-center" title={hostLabel}>
              {hostInitial}
            </span>
            <span className="size-5 rounded-full bg-emerald-500 border border-background text-[9px] font-bold text-white flex items-center justify-center" title="Marina T.">
              M
            </span>
            <span className="size-5 rounded-full bg-rose-500 border border-background text-[9px] font-bold text-white flex items-center justify-center" title="Pedro A.">
              P
            </span>
            <span className="size-5 rounded-full border border-dashed border-muted-foreground/50 bg-muted/60 text-muted-foreground/70 text-[9px] font-bold flex items-center justify-center" title="Vaga reservada para você">
              ?
            </span>
          </div>
          <span className="text-[10px]">te esperando na sala</span>
        </div>
      </div>
    </div>
  );
};
