import React, { useState } from 'react';
import { 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  MousePointer2, 
  ShieldCheck,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  onGoogleLogin?: () => Promise<void>;
  onGuestLogin: (name: string) => Promise<void>;
  isFirebaseConfigured?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onGoogleLogin,
  onGuestLogin,
  isFirebaseConfigured = false,
  description = "Acesse seu workspace colaborativo em tempo real.",
  className,
}) => {
  const [guestName, setGuestName] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogle = async () => {
    if (!onGoogleLogin) return;
    setLoadingGoogle(true);
    setErrorMessage('');
    try {
      await onGoogleLogin();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Falha ao autenticar com Google.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoadingGuest(true);
    setErrorMessage('');
    try {
      await onGuestLogin(guestName.trim());
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Falha ao entrar como convidado.');
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-sm border-border/80 bg-card/90 backdrop-blur-md shadow-xs transition-all", className)}>
      <CardHeader className="flex flex-col items-center gap-3 pb-3 text-center pt-6">
        {/* Logo Oficial Mirio Transparente (Versão Completa) */}
        <div className="flex items-center justify-center py-1">
          <MirioLogo variant="full" className="h-9 w-auto" />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
          {description}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-1">
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive animate-in fade-in-0">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Opção 1: Google Oficial */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loadingGoogle || !isFirebaseConfigured}
            className="relative w-full h-10 justify-center gap-2.5 text-xs font-medium border-border hover:bg-muted/80 transition-colors shadow-none"
          >
            {loadingGoogle ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continuar com Google</span>
          </Button>

          {!isFirebaseConfigured && (
            <div className="flex items-center gap-1.5 justify-center px-2 py-1 rounded border border-border bg-muted/40 text-[11px] text-muted-foreground font-mono">
              <span>Modo local ativo (Firebase não configurado)</span>
            </div>
          )}
        </div>

        {/* Divisor Visual Minimalista */}
        <div className="relative flex items-center justify-center my-0.5">
          <Separator className="w-full" />
          <span className="absolute bg-card px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            ou convidado
          </span>
        </div>

        {/* Formulário Convidado Minimalista */}
        <form onSubmit={handleGuest} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="guest-input" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                <span>Seu nome ou apelido</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">Sem senha</span>
            </div>

            <div className="relative">
              <Input
                id="guest-input"
                type="text"
                placeholder="Ex: Beatriz, Tech Lead, etc."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="h-9 text-xs font-medium pl-3 pr-8 bg-background border-border"
                required
                maxLength={32}
                autoFocus
              />
              {guestName.trim() && (
                <button
                  type="button"
                  onClick={() => setGuestName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Cursor Preview Minimalista Monocromático */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/80 bg-muted/20">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <MousePointer2 className="size-3 text-muted-foreground" />
              <span>Seu cursor:</span>
            </span>
            
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-background text-foreground text-[11px] font-mono shadow-2xs">
              <MousePointer2 className="size-2.5 fill-current" />
              <span className="truncate max-w-[120px]">{guestName.trim() || 'Você'}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loadingGuest || !guestName.trim()}
            className="w-full h-9 text-xs font-semibold gap-1.5 shadow-none"
          >
            {loadingGuest ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>Entrar no Workspace</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </form>

        {/* Rodapé Informativo */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
          <span>Acesso seguro sem cadastro complexo</span>
        </div>
      </CardContent>
    </Card>
  );
};
