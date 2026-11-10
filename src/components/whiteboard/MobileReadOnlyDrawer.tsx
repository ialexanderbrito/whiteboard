import React, { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Hand,
  Laptop,
  Maximize2,
  Share2,
  Sparkles,
  ZoomIn,
} from '@/components/ui/icons';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';

interface MobileReadOnlyDrawerProps {
  open: boolean;
  boardTitle: string;
  elementCount?: number;
  onOpenChange: (open: boolean) => void;
  onBackToDashboard: () => void;
  onFitToContent?: () => void;
}

export const MobileReadOnlyDrawer: React.FC<MobileReadOnlyDrawerProps> = ({
  open,
  boardTitle,
  elementCount = 0,
  onOpenChange,
  onBackToDashboard,
  onFitToContent,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMorphingCopy, setIsMorphingCopy] = useState(false);

  const handleSendToDesktop = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const cleanTitle = boardTitle || 'Quadro sem título';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${cleanTitle} — Mirio`,
          text: `Continue editando o quadro "${cleanTitle}" no computador pelo Mirio:`,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsMorphingCopy(true);
      window.setTimeout(() => {
        setCopiedLink(true);
        setIsMorphingCopy(false);
      }, 90);
      window.setTimeout(() => {
        setIsMorphingCopy(true);
        window.setTimeout(() => {
          setCopiedLink(false);
          setIsMorphingCopy(false);
        }, 90);
      }, 2400);
    } catch {}
  }, [boardTitle]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-slate-950/50 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-[28px] border-t border-border/90 bg-background px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-3 shadow-[0_-18px_48px_-12px_rgba(15,23,42,0.28)] outline-none dark:border-border/75 dark:bg-card">
          <Drawer.Handle className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-muted-foreground/25" />

          <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            {/* 1. Cabeçalho Editorial + Status em Tempo Real */}
            <div
              className="animate-mirio-entrance flex flex-col gap-2.5"
              style={{ animationDelay: '0ms' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Modo Leitura Fluido · Ao vivo
                </span>
                {elementCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    <Sparkles className="size-3 text-primary/80" aria-hidden="true" />
                    {elementCount} {elementCount === 1 ? 'item no quadro' : 'itens no quadro'}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <Drawer.Title className="text-[clamp(1.125rem,4vw,1.3rem)] font-bold leading-snug tracking-tight text-foreground">
                  Explore “{boardTitle || 'Quadro sem título'}” no celular
                </Drawer.Title>
                <Drawer.Description className="text-[13.5px] leading-relaxed text-muted-foreground">
                  Navegue pelo quadro com fluidez total e acompanhe atualizações em tempo real.
                  Para criar post-its, desenhar e editar em equipe, abra este link no computador.
                </Drawer.Description>
              </div>
            </div>

            {/* 2. Guia Visual Rápido de Gestos Touch (3 colunas táteis) */}
            <div
              className="animate-mirio-entrance grid grid-cols-3 gap-2"
              style={{ animationDelay: '45ms' }}
              aria-label="Atalhos de gestos no celular"
            >
              <div className="flex flex-col gap-1.5 rounded-2xl border border-border/75 bg-muted/35 p-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-background text-foreground shadow-2xs dark:bg-muted">
                  <Hand className="size-3.5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold leading-tight text-foreground">Arrastar</p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  1 dedo move o quadro com inércia
                </p>
              </div>

              <div className="flex flex-col gap-1.5 rounded-2xl border border-border/75 bg-muted/35 p-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-background text-foreground shadow-2xs dark:bg-muted">
                  <ZoomIn className="size-3.5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold leading-tight text-foreground">Zoom rápido</p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Pinça ou 2× toque para aproximar
                </p>
              </div>

              <div className="flex flex-col gap-1.5 rounded-2xl border border-border/75 bg-muted/35 p-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-background text-foreground shadow-2xs dark:bg-muted">
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold leading-tight text-foreground">Links ativos</p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Toque em itens com link p/ abrir
                </p>
              </div>
            </div>

            {/* 3. Ponte Cross-Device (Revenue-Centric Handoff: envia link pro PC em 1 toque) */}
            <div
              className="animate-mirio-entrance flex items-center justify-between gap-3 rounded-2xl border border-border/85 bg-muted/45 p-3"
              style={{ animationDelay: '90ms' }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground shadow-2xs">
                  <Laptop className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    Precisa editar ou criar itens?
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    Envie o link para abrir direto no seu computador
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendToDesktop}
                className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${
                  copiedLink
                    ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'border-border bg-background text-foreground shadow-2xs hover:bg-muted'
                }`}
              >
                <span
                  className="inline-flex items-center gap-1.5 transition-[filter,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                  style={{
                    filter: isMorphingCopy ? 'blur(2px)' : 'blur(0px)',
                    opacity: isMorphingCopy ? 0.65 : 1,
                  }}
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="size-3.5" aria-hidden="true" />
                      <span>Enviar p/ PC</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* 4. Ações Principais (44px+ touch targets + feedback tátil scale(0.97)) */}
            <div
              className="animate-mirio-entrance flex flex-col gap-2 pt-0.5"
              style={{ animationDelay: '135ms' }}
            >
              <Drawer.Close asChild>
                <Button
                  size="lg"
                  className="min-h-12 w-full rounded-xl text-sm font-semibold transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]"
                >
                  Explorar quadro agora
                </Button>
              </Drawer.Close>

              <div className="flex items-center gap-2">
                {onFitToContent && elementCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11 flex-1 rounded-xl text-xs font-semibold transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
                    onClick={() => {
                      onFitToContent();
                      onOpenChange(false);
                    }}
                  >
                    <Maximize2 className="size-3.5" data-icon="inline-start" />
                    Enquadrar tudo
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="min-h-11 flex-1 rounded-xl text-xs font-medium text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-foreground active:scale-[0.97]"
                  onClick={onBackToDashboard}
                >
                  <ArrowLeft className="size-3.5" data-icon="inline-start" />
                  Voltar ao workspace
                </Button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
