import React, { useState, useRef, useCallback } from 'react';
import { 
  MousePointer, 
  Hand, 
  StickyNote, 
  Square, 
  Pen, 
  Type, 
  ArrowUpRight, 
  Smile, 
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut
} from '@/components/ui/icons';
import { playReactionPopSound } from '@/utils/audioChime';

interface ReactionParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

export const LoginBoardShowcase: React.FC = () => {
  // Ferramenta ativa selecionada pelo usuário na mini toolbar interativa
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'sticky' | 'shape' | 'pen' | 'text' | 'arrow' | 'reaction'>('select');
  
  // Reações interativas dos post-its
  const [sticky1Reactions, setSticky1Reactions] = useState<{ heart: number; thumbs: number }>({ heart: 4, thumbs: 3 });
  const [sticky2Reactions, setSticky2Reactions] = useState<{ rocket: number; fire: number }>({ rocket: 5, fire: 2 });
  const [sticky3Reactions, setSticky3Reactions] = useState<{ idea: number }>({ idea: 6 });

  // Partículas flutuantes disparadas no clique
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const particleIdRef = useRef(0);

  // Rastreamento sutil do mouse do visitante (cursor "Você")
  const stageRef = useRef<HTMLDivElement>(null);
  const [userPointer, setUserPointer] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  const triggerReaction = (e: React.MouseEvent, type: 'heart' | 'thumbs' | 'rocket' | 'fire' | 'idea', emoji: string) => {
    e.stopPropagation();
    playReactionPopSound();

    if (type === 'heart') setSticky1Reactions((prev) => ({ ...prev, heart: prev.heart + 1 }));
    if (type === 'thumbs') setSticky1Reactions((prev) => ({ ...prev, thumbs: prev.thumbs + 1 }));
    if (type === 'rocket') setSticky2Reactions((prev) => ({ ...prev, rocket: prev.rocket + 1 }));
    if (type === 'fire') setSticky2Reactions((prev) => ({ ...prev, fire: prev.fire + 1 }));
    if (type === 'idea') setSticky3Reactions((prev) => ({ ...prev, idea: prev.idea + 1 }));

    // Dispara partícula flutuante na posição do clique
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const newParticle = { id: ++particleIdRef.current, emoji, x: clickX, y: clickY };
      setParticles((prev) => [...prev, newParticle]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
      }, 700);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setUserPointer({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });
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
      aria-label="Demonstração interativa de quadro colaborativo em tempo real"
    >
      {/* 1. Canvas Grid Arquitetural de Pontos do Mirio */}
      <div 
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(#e4e4e7_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#27272a_1.2px,transparent_1.2px)] [background-size:22px_22px] opacity-80" 
      />

      {/* 2. Mini Barra de Ferramentas Real do Whiteboard (Flutuante no Topo) */}
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

          <button
            type="button"
            onClick={() => setActiveTool('hand')}
            className={`flex size-6.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.93] ${
              activeTool === 'hand' 
                ? 'bg-foreground text-background shadow-2xs' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Mover Tela / Pan (H)"
          >
            <Hand className="size-3" />
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

      {/* 3. Área de Conteúdo do Canvas (Whiteboard Real com Frame, Stickies e Conexões) */}
      <div className="relative z-10 flex-1 w-full px-2 sm:px-4 py-1 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="relative w-full max-w-2xl h-[235px] sm:h-[250px]">

          {/* FRAME DE QUADRO: "✦ Sprint Retrospectiva & Ideação" */}
          <div className="absolute inset-x-0 top-0 bottom-0 rounded-xl border border-dashed border-border/80 bg-background/40 backdrop-blur-[2px] p-2.5 flex flex-col justify-between">
            {/* Header do Frame */}
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <div className="flex items-center gap-2">
                <Layers className="size-3 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-foreground tracking-tight">
                  Frame: Sprint Retrospectiva & Ideação
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground">
                  #sprint-14
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                3 membros ativos
              </span>
            </div>

            {/* Rodapé interno do Frame com contagem de notas */}
            <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/40">
              <span>3 notas organizadas • 2 conexões</span>
              <span>Visualização do time</span>
            </div>
          </div>

          {/* SVG DE CONECTORES / SETAS DE FLUXO */}
          <svg 
            className="absolute inset-0 pointer-events-none w-full h-full z-10" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker
                id="mirio-arrow-head"
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
            {/* Linha curva conectando Nota 1 à Nota 2 */}
            <path
              d="M 185 65 C 235 45, 275 90, 325 65"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              strokeOpacity="0.6"
              markerEnd="url(#mirio-arrow-head)"
            />
            {/* Linha conectando Nota 2 à Nota 3 */}
            <path
              d="M 390 130 C 360 165, 330 160, 280 175"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity="0.45"
              markerEnd="url(#mirio-arrow-head)"
            />
          </svg>

          {/* TAG FLUTUANTE NA LINHA CONECTORA */}
          <div className="absolute left-[242px] top-[55px] z-15 -translate-x-1/2 -translate-y-1/2 hidden sm:block pointer-events-none">
            <span className="rounded-full border border-border/80 bg-background/90 px-2 py-0.5 text-[9px] font-mono text-muted-foreground shadow-2xs backdrop-blur-xs">
              próximo passo ➔
            </span>
          </div>

          {/* =========================================================================
              COMPONENTE REAL 1: Post-it Amarelo Mirio (#fff9b1) — Ideação
             ========================================================================= */}
          <div 
            className="absolute left-1.5 sm:left-3 top-5 w-40 sm:w-48 rounded-xl p-2.5 shadow-md select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border border-amber-300/80 z-15"
            style={{
              backgroundColor: '#fff9b1',
              color: '#713f12',
              transform: 'rotate(-1.5deg)',
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-amber-300/60 text-[9px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>Ideação</span>
              </span>
              <span className="font-mono text-[8px] opacity-75">#onboarding</span>
            </div>

            <p className="pt-1.5 text-[11px] font-medium leading-snug">
              Mapear fluxo de onboarding e convite em 1 clique para novos membros.
            </p>

            <div className="pt-1.5 mt-1 flex items-center justify-between border-t border-amber-300/50 text-[9px]">
              <span className="font-medium opacity-85">Sofia M.</span>
              
              {/* Pílulas de Reações Clicáveis */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => triggerReaction(e, 'heart', '❤️')}
                  className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                  title="Reagir com coração"
                >
                  <span>❤️</span>
                  <span>{sticky1Reactions.heart}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => triggerReaction(e, 'thumbs', '👍')}
                  className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                  title="Reagir com joinha"
                >
                  <span>👍</span>
                  <span>{sticky1Reactions.thumbs}</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              COMPONENTE REAL 2: Post-it Verde Menta Mirio (#dcfce7) — Decisão
             ========================================================================= */}
          <div 
            className="absolute right-1.5 sm:right-3 top-4 w-44 sm:w-50 rounded-xl p-2.5 shadow-md select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border border-emerald-300/80 z-15"
            style={{
              backgroundColor: '#dcfce7',
              color: '#14532d',
              transform: 'rotate(1.8deg)',
            }}
          >
            {/* Caixa de Seleção Dinâmica do Lucas (Marquee com handles de redimensionamento) */}
            <div className="animate-login-lucas-selection absolute -inset-1 rounded-xl border-2 border-emerald-500 bg-emerald-500/[0.04] pointer-events-none">
              <span className="absolute -top-1.5 -left-1.5 size-2 rounded-xs bg-emerald-500 border border-white shadow-xs" />
              <span className="absolute -top-1.5 -right-1.5 size-2 rounded-xs bg-emerald-500 border border-white shadow-xs" />
              <span className="absolute -bottom-1.5 -left-1.5 size-2 rounded-xs bg-emerald-500 border border-white shadow-xs" />
              <span className="absolute -bottom-1.5 -right-1.5 size-2 rounded-xs bg-emerald-500 border border-white shadow-xs" />
            </div>

            <div className="flex items-center justify-between pb-1 border-b border-emerald-300/60 text-[9px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                <span>Decisão</span>
              </span>
              <span className="font-mono text-[8px] opacity-75">#apresentação</span>
            </div>

            <p className="pt-1.5 text-[11px] font-medium leading-snug">
              Modo Apresentação interativo e exportação em alta qualidade (PNG e SVG).
            </p>

            <div className="pt-1.5 mt-1 flex items-center justify-between border-t border-emerald-300/50 text-[9px]">
              <span className="font-medium opacity-85">Lucas R.</span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => triggerReaction(e, 'rocket', '🚀')}
                  className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                  title="Reagir com foguete"
                >
                  <span>🚀</span>
                  <span>{sticky2Reactions.rocket}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => triggerReaction(e, 'fire', '🔥')}
                  className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                  title="Reagir com fogo"
                >
                  <span>🔥</span>
                  <span>{sticky2Reactions.fire}</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              COMPONENTE REAL 3: Post-it Azul Glacial Mirio (#e0f2fe) — Backlog / Votação
             ========================================================================= */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 bottom-2 w-44 sm:w-50 rounded-xl p-2.5 shadow-md select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border border-sky-300/80 z-15"
            style={{
              backgroundColor: '#e0f2fe',
              color: '#0c4a6e',
              transform: 'translate(-50%, 0) rotate(-0.6deg)',
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-sky-300/60 text-[9px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-sky-500" />
                <span>Votação</span>
              </span>
              <span className="font-mono text-[8px] opacity-75">#sprint-prep</span>
            </div>

            <p className="pt-1.5 text-[11px] font-medium leading-snug">
              Votação silenciosa: dinâmica ágil com timer para priorizar ideias do time.
            </p>

            <div className="pt-1.5 mt-1 flex items-center justify-between border-t border-sky-300/50 text-[9px]">
              <span className="font-medium opacity-85">Camila P.</span>

              <button
                type="button"
                onClick={(e) => triggerReaction(e, 'idea', '💡')}
                className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-white/70 hover:bg-white text-[9px] font-semibold shadow-2xs transition-transform active:scale-[0.93] cursor-pointer"
                title="Reagir com lâmpada"
              >
                <span>💡</span>
                <span>{sticky3Reactions.idea}</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              4. CURSORES COLABORATIVOS EM MOVIMENTO FLUIDO (100% GPU LERP/KEYFRAME)
             ========================================================================= */}

          {/* CURSOR 1: Sofia (Índigo #6366f1) — Posicionando e Editando */}
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
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Sofia M.
                </span>
              </div>

              {/* Balão de Cursor Chat Estilo Figma / Mirio */}
              <div className="animate-login-chat-sofia absolute left-4 -top-8 origin-bottom-left z-40 pointer-events-none">
                <div className="relative bg-card text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1.5">
                  <span>Organizando cards da sprint</span>
                  <span>📌</span>
                  <div className="absolute -bottom-1 left-2 size-2 bg-card border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* CURSOR 2: Lucas (Esmeralda #10b981) — Selecionando e Votando */}
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
                <Pen className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Lucas R.
                </span>
              </div>

              {/* Balão de Cursor Chat Estilo Figma / Mirio */}
              <div className="animate-login-chat-lucas absolute left-4 -top-8 origin-bottom-left z-40 pointer-events-none">
                <div className="relative bg-card text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1.5">
                  <span>Aprovado para a Sprint 14!</span>
                  <span>🚀</span>
                  <div className="absolute -bottom-1 left-2 size-2 bg-card border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* CURSOR 3: Camila (Rosa #f43f5e) — Conectando e Facilitando */}
          <div 
            className="animate-login-cursor-camila absolute left-1/3 bottom-12 pointer-events-none will-change-transform z-30"
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
                <Sparkles className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Camila P.
                </span>
              </div>

              {/* Balão de Cursor Chat Estilo Figma / Mirio */}
              <div className="animate-login-chat-camila absolute left-4 -top-8 origin-bottom-left z-40 pointer-events-none">
                <div className="relative bg-card text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1.5">
                  <span>Votação aberta no board</span>
                  <span>✨</span>
                  <div className="absolute -bottom-1 left-2 size-2 bg-card border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {/* CURSOR INTERATIVO DO USUÁRIO ("Você") — Ativado ao passar o mouse */}
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
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] font-medium text-white tracking-tight leading-none">
                    Você
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PARTÍCULAS DE REAÇÃO (Subindo suavemente ao clicar) */}
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

      {/* 5. Controles do Rodapé do Canvas (Zoom e Indicador de Colaboradores) */}
      <div className="relative z-20 flex items-center justify-between px-3 sm:px-4 py-1.5 border-t border-border/40 bg-background/50 text-[10px] font-mono text-muted-foreground backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px]">
            <ZoomOut className="size-2.5 mr-1 opacity-70" />
            <span className="font-semibold text-foreground">100%</span>
            <ZoomIn className="size-2.5 ml-1 opacity-70" />
          </div>
          <span className="hidden sm:inline-block text-[10px]">Canvas Infinito</span>
        </div>

        {/* Avatares dos Colaboradores Simulados na Sala */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5">
            <span className="size-5 rounded-full bg-indigo-500 border border-background text-[9px] font-bold text-white flex items-center justify-center" title="Sofia M.">
              S
            </span>
            <span className="size-5 rounded-full bg-emerald-500 border border-background text-[9px] font-bold text-white flex items-center justify-center" title="Lucas R.">
              L
            </span>
            <span className="size-5 rounded-full bg-rose-500 border border-background text-[9px] font-bold text-white flex items-center justify-center" title="Camila P.">
              C
            </span>
            <span className="size-5 rounded-full bg-blue-600 border border-background text-[9px] font-bold text-white flex items-center justify-center" title="Você">
              V
            </span>
          </div>
          <span className="text-[10px] font-medium text-foreground">
            3 colegas no canvas
          </span>
        </div>
      </div>
    </div>
  );
};
