import React from 'react';
import { ArrowLeft, Eye, Monitor } from 'lucide-react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';

interface MobileReadOnlyDrawerProps {
  open: boolean;
  boardTitle: string;
  onOpenChange: (open: boolean) => void;
  onBackToDashboard: () => void;
}

export const MobileReadOnlyDrawer: React.FC<MobileReadOnlyDrawerProps> = ({
  open,
  boardTitle,
  onOpenChange,
  onBackToDashboard,
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange}>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]" />
      <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-[28px] border-t border-border bg-background px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl outline-none">
        <Drawer.Handle className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Eye aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <Drawer.Title className="text-lg font-semibold tracking-tight text-foreground">
                Visualização no celular
              </Drawer.Title>
              <Drawer.Description className="text-sm leading-6 text-muted-foreground">
                O Mirio foi feito para uso em computador, notebook ou telas maiores.
                No celular, “{boardTitle}” fica disponível somente para visualização.
              </Drawer.Description>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Monitor aria-hidden="true" className="size-4 shrink-0" />
            <span>Abra em uma tela maior para criar, editar e colaborar.</span>
          </div>

          <div className="flex flex-col gap-2">
            <Drawer.Close asChild>
              <Button size="lg" className="w-full">
                Continuar visualizando
              </Button>
            </Drawer.Close>
            <Button variant="ghost" size="lg" className="w-full" onClick={onBackToDashboard}>
              <ArrowLeft data-icon="inline-start" />
              Voltar ao workspace
            </Button>
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);
