import React, { useState } from 'react';
import { Globe, Link2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeUrl } from '../../utils/textLinks';

interface EditLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  initialLabel?: string;
  isNew?: boolean;
  onSave: (url: string, label?: string) => void;
  onRemove?: () => void;
}

export const EditLinkModal: React.FC<EditLinkModalProps> = ({
  open,
  onOpenChange,
  initialUrl = '',
  initialLabel = '',
  isNew = false,
  onSave,
  onRemove,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [label, setLabel] = useState(initialLabel);
  const [prevOpen, setPrevOpen] = useState(open);

  // Sincroniza estado inicial na abertura do modal durante a renderização (padrão oficial React)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUrl(initialUrl || '');
      setLabel(initialLabel || '');
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    onSave(normalizeUrl(trimmedUrl), label.trim() || undefined);
    onOpenChange(false);
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 gap-5 bg-card border-border shadow-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 ring-4 ring-blue-500/5">
            <Link2 className="size-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
              {isNew ? 'Inserir Hiperlink' : 'Editar Hiperlink'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
              Vincule um endereço web e texto de exibição ao elemento.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Endereço web (URL) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="url"
                autoFocus
                placeholder="https://exemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Texto de exibição (opcional)
            </label>
            <Input
              type="text"
              placeholder="Ex: Clique aqui ou Flamengo"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 text-xs sm:text-sm"
            />
            <p className="text-[10px] text-muted-foreground leading-normal">
              Se preenchido, apenas a palavra ou frase correspondente ficará sublinhada e clicável.
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            {!isNew && onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2.5 h-8 mr-auto cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Remover link</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs px-3 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!url.trim()}
                className="h-8 text-xs font-semibold px-4 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
