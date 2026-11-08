import React, { useState } from 'react';
import { Check, User, Sparkles } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CurrentUser } from '@/types/board';
import { USER_COLORS } from '@/utils/colors';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: CurrentUser;
  onSave: (newName: string, newColor: string) => Promise<void> | void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  open,
  onOpenChange,
  currentUser,
  onSave,
}) => {
  const [name, setName] = useState(currentUser.displayName || '');
  const [color, setColor] = useState(currentUser.color || USER_COLORS[5]);
  const [isSaving, setIsSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Sincroniza estado inicial na abertura do modal durante a renderização (padrão oficial React)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(currentUser.displayName || '');
      setColor(currentUser.color || USER_COLORS[5]);
      setIsSaving(false);
    }
  }

  const isGoogleUser = !currentUser.isAnonymous;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const trimmed = name.trim();
    if (!isGoogleUser && !trimmed) return;

    try {
      setIsSaving(true);
      await onSave(isGoogleUser ? currentUser.displayName : trimmed, color);
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const trimmedName = isGoogleUser ? currentUser.displayName : name.trim();
  const hasChanges = isGoogleUser
    ? color.toLowerCase() !== (currentUser.color || '').toLowerCase()
    : trimmedName !== currentUser.displayName || color.toLowerCase() !== (currentUser.color || '').toLowerCase();
  const initial = (trimmedName || 'Você').charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl shadow-xl border-border bg-card">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {isGoogleUser ? 'Personalizar Cor do Cursor' : 'Trocar Nome de Convidado'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isGoogleUser
              ? 'Sua conta está conectada com o Google. Seu nome e foto de perfil são sincronizados da sua Conta Google.'
              : 'Personalize seu nome e cor de cursor para colaborar em tempo real no quadro.'}
          </DialogDescription>
        </DialogHeader>

        {/* Pré-visualização ao vivo do Avatar e Cursor */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-center gap-3">
          <Avatar className="size-11 ring-2 ring-background shadow-xs transition-transform">
            {currentUser.photoURL ? (
              <AvatarImage
                src={currentUser.photoURL}
                alt={trimmedName}
                referrerPolicy="no-referrer"
              />
            ) : null}
            <AvatarFallback
              className="text-white text-base font-bold transition-colors"
              style={{ backgroundColor: color }}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold text-foreground truncate block">
                {trimmedName || 'Seu nome'}
              </span>
              {isGoogleUser ? (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium border-blue-500/30 text-blue-600 dark:text-blue-400 shrink-0 gap-1">
                  <svg className="size-2.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google</span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium shrink-0">
                  Convidado
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-amber-500 shrink-0" />
              <span>Visível em tempo real no cursor e notas</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo de Nome */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-display-name-input"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Nome de Exibição</span>
              {!isGoogleUser && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  {name.length}/30 caracteres
                </span>
              )}
            </label>
            <Input
              id="edit-display-name-input"
              type="text"
              value={isGoogleUser ? currentUser.displayName : name}
              maxLength={30}
              disabled={isGoogleUser}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome ou apelido..."
              className={`h-9 text-xs rounded-lg border-border focus-visible:ring-primary ${
                isGoogleUser ? 'bg-muted/50 cursor-not-allowed opacity-90 text-foreground font-medium' : 'bg-background'
              }`}
              autoFocus={!isGoogleUser}
            />
            {isGoogleUser && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <span>🔒 Nome sincronizado com a sua conta Google (não editável).</span>
              </p>
            )}
          </div>

          {/* Seletor de Cores do Cursor */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Cor do Cursor & Presença
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border/60 bg-muted/20">
              {USER_COLORS.map((c) => {
                const isSelected = c.toLowerCase() === color.toLowerCase();
                return (
                  <Tooltip key={c}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setColor(c)}
                        className={`size-6 rounded-full transition-all flex items-center justify-center cursor-pointer border ${
                          isSelected
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xs'
                            : 'border-black/15 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Selecionar cor ${c}`}
                      >
                        {isSelected && <Check className="size-3 text-white stroke-[3]" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Selecionar esta cor</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!hasChanges || isSaving || (!isGoogleUser && !trimmedName)}
              className="h-8 text-xs font-medium rounded-lg gap-1.5"
            >
              {isSaving ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>{isGoogleUser ? 'Salvar Cor do Cursor' : 'Salvar Nome'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

EditProfileModal.displayName = 'EditProfileModal';
