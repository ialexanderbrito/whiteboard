import React, { useState, useCallback } from 'react';
import { ArrowLeft, Check, Eye, Maximize2, Share2 } from '@/components/ui/icons';
import { MirioLogo } from '@/components/layout/MirioLogo';

export interface MobileBoardNavbarProps {
  boardTitle: string;
  scale: number;
  elementCount: number;
  onlineCount?: number;
  onBackToDashboard: () => void;
  onFitToContent: () => void;
  onOpenMobileGuide: () => void;
}

export const MobileBoardNavbar: React.FC<MobileBoardNavbarProps> = React.memo(({
  boardTitle,
  scale,
  elementCount,
  onlineCount = 0,
  onBackToDashboard,
  onFitToContent,
  onOpenMobileGuide,
}) => {
  const [copied, setCopied] = useState(false);
  const [isTransitioningCopy, setIsTransitioningCopy] = useState(false);

  const handleShareOrCopy = useCallback(async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const title = boardTitle || 'Quadro no Mirio';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${title} — Mirio`,
          text: `Abra o quadro "${title}" no computador para editar e colaborar no Mirio:`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsTransitioningCopy(true);
      window.setTimeout(() => {
        setCopied(true);
        setIsTransitioningCopy(false);
      }, 90);
      window.setTimeout(() => {
        setIsTransitioningCopy(true);
        window.setTimeout(() => {
          setCopied(false);
          setIsTransitioningCopy(false);
        }, 90);
      }, 2000);
    } catch {}
  }, [boardTitle]);

  const zoomPercent = Math.round((scale || 1) * 100);

  return (
    <header
      aria-label="Barra de navegação mobile do quadro"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 px-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-auto mx-auto flex h-12 max-w-lg items-center justify-between gap-1 rounded-2xl border border-border/85 bg-background/95 px-1.5 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.12)] dark:border-border/70 dark:bg-card/95 dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.55)]">
        {/* Cluster Esquerdo: Voltar (44x44px touch target) + Identidade + Gatilho do Guia */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            onClick={onBackToDashboard}
            aria-label="Voltar ao workspace"
            title="Voltar ao workspace"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-foreground/85 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.96] active:bg-muted"
          >
            <ArrowLeft className="size-4.5" />
          </button>

          <div className="h-5 w-px shrink-0 bg-border/75" aria-hidden="true" />

          <button
            type="button"
            onClick={onOpenMobileGuide}
            aria-label={`Informações do modo visualização de ${boardTitle || 'Quadro sem título'}`}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-left transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/60 active:scale-[0.98] active:bg-muted/80"
          >
            <MirioLogo variant="compact" className="h-5 w-auto shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-foreground">
                  {boardTitle || 'Quadro sem título'}
                </p>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-medium leading-none text-muted-foreground">
                <span
                  className="inline-block size-1.5 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <Eye className="size-2.5 shrink-0 text-muted-foreground/80" aria-hidden="true" />
                <span className="truncate">
                  Somente visualização
                  {onlineCount > 0 ? ` · ${onlineCount + 1} online` : ' · Dicas'}
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Cluster Direito: Enquadrar/Zoom + Enviar link para PC */}
        <div className="flex shrink-0 items-center gap-1">
          {elementCount > 0 && (
            <button
              type="button"
              onClick={onFitToContent}
              aria-label={`Ajustar quadro à tela (zoom atual ${zoomPercent}%)`}
              title="Enquadrar conteúdo na tela"
              className="flex h-9 min-w-[44px] items-center justify-center gap-1 rounded-xl border border-border/75 bg-muted/45 px-2.5 text-[11px] font-semibold tabular-nums text-foreground transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.96]"
            >
              <Maximize2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Ajustar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareOrCopy}
            aria-label={copied ? 'Link copiado' : 'Enviar ou copiar link para abrir no computador'}
            title={copied ? 'Link copiado!' : 'Enviar link para o computador'}
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] ${
              copied
                ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-foreground/80 hover:bg-muted active:bg-muted'
            }`}
          >
            <span
              className="inline-flex items-center justify-center transition-[filter,opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{
                filter: isTransitioningCopy ? 'blur(2px)' : 'blur(0px)',
                opacity: isTransitioningCopy ? 0.65 : 1,
              }}
            >
              {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
});

MobileBoardNavbar.displayName = 'MobileBoardNavbar';
