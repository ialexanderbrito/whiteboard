import React from 'react';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { LoadingCollaboratorCursors } from '@/components/layout/LoadingCollaboratorCursors';
import { cn } from '@/lib/utils';

export interface LoadingScreenProps {
  /** Se deve ocupar a tela inteira com position fixed (padrão: true) */
  fullscreen?: boolean;
  /** Mensagem contextual de carregamento (opcional) */
  message?: string;
  /** Se deve exibir os cursores colaborativos fakes animados (padrão: true) */
  showCursors?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * LoadingScreen — Tela de Carregamento Global Minimalista & Fluida do Mirio.
 *
 * Aplicação dos princípios de Design Engineering (Emil Kowalski) & Frontend Design:
 * - 100% acelerado via GPU (apenas transform e opacity).
 * - Sem pulos de animação: transição suave de escala (scale 0.985 -> 1) ancorada no centro.
 * - Trilho laser 100% contínuo e sem saltos de keyframe (saída total do feixe à direita).
 * - Cursores colaborativos fakes (Sofia, Lucas e Camila) simulando o canvas multiplayer vivo do Mirio.
 * - Suporte pleno a prefers-reduced-motion e layout adaptativo/responsivo.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = true,
  message,
  showCursors = true,
  className,
}) => {
  return (
    <div
      role="status"
      aria-label={message || 'Carregando...'}
      className={cn(
        'relative flex flex-col items-center justify-center bg-background text-foreground select-none overflow-hidden',
        fullscreen ? 'fixed inset-0 w-screen h-screen z-50' : 'w-full h-full min-h-[340px]',
        className
      )}
    >
      {/* Padrão Arquitetural de Pontos do Canvas Mirio */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70"
      />

      {/* Vinheta radial de profundidade para foco central */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background)/0.8)_85%)]"
      />

      {/* Cursores Colaborativos Fakes (Simulam colegas preparando o canvas em tempo real) */}
      {showCursors && <LoadingCollaboratorCursors />}

      {/* Emblema Central e Trilho Laser Linear Minimalista */}
      <div className="relative z-10 animate-mirio-entrance flex flex-col items-center justify-center gap-4">
        {/* Emblema com Aura de Respiração Suave */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-2 rounded-full bg-foreground/5 blur-lg -z-10 animate-pulse-slow"
          />
          <MirioLogo variant="compact" className="h-9 w-auto object-contain select-none" />
        </div>

        {/* Trilho de Progresso Laser Contínuo e Fluido */}
        <div
          aria-hidden="true"
          className="relative h-1 w-40 rounded-full bg-muted/80 overflow-hidden border border-border/40 shadow-inner"
        >
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-foreground to-transparent animate-mirio-beam will-change-transform" />
        </div>

        {/* Mensagem Opcional de Status Elegante e Silenciosa */}
        {message && (
          <p className="text-xs font-medium text-muted-foreground/80 tracking-tight select-none">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export const PageLoader: React.FC<LoadingScreenProps> = (props) => (
  <LoadingScreen {...props} />
);
