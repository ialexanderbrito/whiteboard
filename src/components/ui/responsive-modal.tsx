import * as React from 'react';
import { Drawer } from 'vaul';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Detecta viewports touch/estreitas para trocar o shell do modal:
 * < 768px → bottom sheet arrastável (vaul), >= 768px → Dialog centralizado tradicional.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  return isMobile;
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
              'flex max-h-[calc(92dvh-1.25rem)] flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-2',
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
