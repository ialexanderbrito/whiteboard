import React from 'react';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { cn } from '@/lib/utils';

export interface LoadingScreenProps {
  /** Se deve ocupar a tela inteira com position fixed (padrão: true) */
  fullscreen?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * LoadingScreen — Tela de Carregamento Global Ultra-Minimalista do Mirio.
 *
 * Aplicação dos princípios de Design Engineering (Emil Kowalski):
 * - 100% acelerado via GPU (apenas transform e opacity).
 * - Sem animações a partir de scale(0) (inicia em scale 0.96 com opacidade suave).
 * - Easing orgânico cubic-bezier(0.23, 1, 0.32, 1).
 * - Uma única tela global para toda a aplicação: minimalista, silenciosa, sem poluição visual.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = true,
  className,
}) => {
  return (
    <div
      role="status"
      aria-label="Carregando..."
      className={cn(
        'relative flex flex-col items-center justify-center bg-background text-foreground select-none overflow-hidden',
        fullscreen ? 'fixed inset-0 w-screen h-screen z-50' : 'w-full h-full min-h-[300px]',
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

      {/* Emblema Central e Trilho Laser Linear Minimalista */}
      <div className="relative z-10 animate-mirio-entrance flex flex-col items-center justify-center gap-5">
        {/* Emblema com Aura de Respiração Suave */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-2 rounded-full bg-foreground/5 blur-lg -z-10 animate-pulse-slow"
          />
          <MirioLogo variant="compact" className="h-9 w-auto object-contain select-none" />
        </div>

        {/* Trilho de Progresso Linear de Alta Precisão (Substitui o circular progress) */}
        <div
          aria-hidden="true"
          className="relative h-0.5 w-36 rounded-full bg-muted/80 overflow-hidden border border-border/30"
        >
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-foreground to-transparent animate-mirio-beam" />
        </div>
      </div>
    </div>
  );
};

export const PageLoader: React.FC<LoadingScreenProps> = (props) => (
  <LoadingScreen {...props} />
);
