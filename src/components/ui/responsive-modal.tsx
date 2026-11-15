/* oxlint-disable react/only-export-components */
import * as React from 'react';
import { Drawer } from 'vaul';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const MOBILE_QUERY = '(max-width: 767px)';

function subscribeMobile(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getMobileSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot(): boolean {
  return false;
}

/**
 * Detecta viewports touch/estreitas para trocar o shell do modal:
 * < 768px → bottom sheet arrastável (vaul), >= 768px → Dialog centralizado tradicional.
 */
export function useIsMobileViewport(): boolean {
  return React.useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot);
}

interface ResponsiveModalRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Raiz compartilhada dos modais do Mirio:
 * - Mobile: Drawer do vaul (bottom sheet com gesto de arrastar para fechar)
 * - Desktop: Dialog do Radix (comportamento atual)
 */
export const ResponsiveModalRoot: React.FC<ResponsiveModalRootProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  const isMobile = useIsMobileViewport();

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
};

interface ResponsiveModalContentProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Conteúdo compartilhado dos modais do Mirio:
 * - Mobile: sheet ancorado no rodapé com handle arrastável, scroll interno e Close
 * - Desktop: DialogContent tradicional (estilos originais preservados via className)
 */
export const ResponsiveModalContent: React.FC<ResponsiveModalContentProps> = ({
  className,
  children,
}) => {
  const isMobile = useIsMobileViewport();

  if (isMobile) {
    return (
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border-t border-border/80 bg-background shadow-[0_-18px_48px_-12px_rgba(15,23,42,0.28)] outline-none dark:bg-card">
          <Drawer.Handle className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25" />
          <div
            className={cn(
              'flex max-h-[calc(92dvh-1.25rem)] flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-2 custom-scrollbar',
              className
            )}
          >
            {children}
          </div>
          <Drawer.Close className="absolute right-3 top-3 z-10 rounded-full bg-muted/60 p-1.5 text-muted-foreground opacity-90 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </Drawer.Close>
        </Drawer.Content>
      </Drawer.Portal>
    );
  }

  return <DialogContent className={className}>{children}</DialogContent>;
};
