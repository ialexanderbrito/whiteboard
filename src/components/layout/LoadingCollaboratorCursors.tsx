import React from 'react';
import { StickyNote, Pen, Sparkles } from '@/components/ui/icons';

/**
 * LoadingCollaboratorCursors — Cursores Colaborativos Fakes para a Tela de Loading do Mirio.
 *
 * Princípios de Design Engineering (Emil Kowalski) & Frontend Design:
 * - 100% acelerado via hardware (translate3d, scale, opacity).
 * - Simula a experiência multiplayer em tempo real do Mirio com colegas preparando o canvas.
 * - Sofia: Arrasta e posiciona uma nota adesiva com click ripple orgânico.
 * - Lucas: Seleciona elementos do wireframe e envia mensagem via cursor chat.
 * - Camila: Inspeciona o board com ponteiro colaborativo.
 * - Responsivo e seguro para dispositivos móveis (scale adaptativo, sem overflow).
 * - Totalmente compatível com prefers-reduced-motion.
 */
export const LoadingCollaboratorCursors: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
    >
      {/* Wrapper responsivo de coordenadas relativas ao centro */}
      <div className="relative w-full max-w-5xl h-full max-h-[580px] flex items-center justify-center scale-75 sm:scale-90 md:scale-100 transition-transform">
        
        {/* ==========================================================================
            1. Sofia (Índigo #6366f1) — Posicionando Sticky Note
           ========================================================================== */}
        <div className="absolute left-4 sm:left-10 md:left-16 lg:left-24 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {/* Mini Sticky Note arrastado e solto no canvas */}
          <div className="animate-mirio-sticky-drag relative w-24 sm:w-28 rounded-lg bg-amber-100/95 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/60 p-2 sm:p-2.5 shadow-md backdrop-blur-xs transition-colors">
            {/* Tag do Post-it */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] font-semibold text-amber-900/90 dark:text-amber-200/90 tracking-tight leading-none">
                ✦ Ideias Mirio
              </span>
            </div>
            {/* Esqueleto de linhas de texto do post-it */}
            <div className="space-y-1">
              <div className="h-1 w-full bg-amber-400/35 dark:bg-amber-400/25 rounded-full" />
              <div className="h-1 w-4/5 bg-amber-400/25 dark:bg-amber-400/20 rounded-full" />
            </div>
          </div>

          {/* Cursor da Sofia */}
          <div className="animate-mirio-cursor-sofia absolute -top-3 -left-3 will-change-transform z-20">
            {/* Click Ripple da Sofia (dispara no momento que a nota assenta) */}
            <span
              className="animate-mirio-ripple-sofia absolute -top-1 -left-1 size-7 rounded-full border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none"
            />

            {/* Seta do Cursor SVG */}
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

              {/* Tag com Nome e Ícone de Ferramenta */}
              <div
                className="absolute left-3.5 top-3 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor: '#6366f1',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <StickyNote className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Sofia
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================================
            2. Lucas (Esmeralda #10b981) — Selecionando e Chatting
           ========================================================================== */}
        <div className="absolute right-4 sm:right-10 md:right-16 lg:right-24 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {/* Card Wireframe com Caixa de Seleção Dinâmica */}
          <div className="relative w-28 sm:w-32 rounded-lg bg-card/60 dark:bg-card/40 border border-border/70 p-2 sm:p-2.5 shadow-sm backdrop-blur-xs">
            {/* Borda de Seleção Estilo Figma/Mirio */}
            <div className="animate-mirio-lucas-selection absolute -inset-1 rounded-lg border-1.5 border-dashed border-emerald-500/80 bg-emerald-500/[0.04]">
              {/* Pontos de ancoragem nos cantos */}
              <span className="absolute -top-1 -left-1 size-2 rounded-xs bg-emerald-500 border border-white" />
              <span className="absolute -top-1 -right-1 size-2 rounded-xs bg-emerald-500 border border-white" />
              <span className="absolute -bottom-1 -left-1 size-2 rounded-xs bg-emerald-500 border border-white" />
              <span className="absolute -bottom-1 -right-1 size-2 rounded-xs bg-emerald-500 border border-white" />
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-foreground/90 tracking-tight leading-none">
                ✦ Sprint 24
              </span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            {/* Mini barra de progresso simulada dentro do card */}
            <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-emerald-500/80 rounded-full" />
            </div>
          </div>

          {/* Cursor do Lucas */}
          <div className="animate-mirio-cursor-lucas absolute -bottom-4 -left-2 will-change-transform z-20">
            {/* Click Ripple do Lucas */}
            <span
              className="animate-mirio-ripple-lucas absolute -top-1 -left-1 size-7 rounded-full border-2 border-emerald-500 bg-emerald-500/20 pointer-events-none"
            />

            {/* Seta do Cursor SVG */}
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

              {/* Tag com Nome e Ícone de Ferramenta */}
              <div
                className="absolute left-3.5 top-3 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor: '#10b981',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <Pen className="size-2.5 text-white/90 shrink-0" />
                <span className="text-[10px] font-medium text-white tracking-tight leading-none">
                  Lucas
                </span>
              </div>

              {/* Balão de Cursor Chat Estilo Figma / Mirio */}
              <div className="animate-mirio-lucas-chat absolute left-4 -top-8 origin-bottom-left z-30 pointer-events-none">
                <div className="relative bg-card/95 text-foreground px-2.5 py-1 rounded-xl rounded-bl-xs border border-border/80 shadow-md backdrop-blur-md text-[10px] font-medium whitespace-nowrap flex items-center gap-1">
                  <span>Organizando canvas</span>
                  <span className="text-emerald-500">✨</span>
                  {/* Rabicho do balão */}
                  <div className="absolute -bottom-1 left-2 size-2 bg-card/95 border-r border-b border-border/80 rotate-45" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================================
            3. Camila (Rosa/Coral #f43f5e) — Inspecionando Topo (Telas Maiores)
           ========================================================================== */}
        <div className="hidden sm:block absolute right-14 md:right-24 top-10 md:top-14">
          <div className="animate-mirio-cursor-camila relative will-change-transform z-10">
            {/* Click Ripple da Camila */}
            <span
              className="animate-mirio-ripple-camila absolute -top-1 -left-1 size-6 rounded-full border-2 border-rose-500 bg-rose-500/20 pointer-events-none"
            />

            <div className="relative origin-top-left">
              <svg
                width="20"
                height="20"
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
                className="absolute left-3 top-2.5 flex items-center px-1.5 py-0.5 rounded-full gap-1 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor: '#f43f5e',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                }}
              >
                <Sparkles className="size-2 text-white/90 shrink-0" />
                <span className="text-[9px] font-medium text-white tracking-tight leading-none">
                  Camila
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
