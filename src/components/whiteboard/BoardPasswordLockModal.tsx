import React, { useState } from 'react';
import { Lock, KeyRound, ArrowLeft, AlertCircle, Eye, EyeOff } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BoardPasswordLockModalProps {
  isOpen: boolean;
  boardTitle: string;
  onUnlock: (password: string) => boolean | Promise<boolean>;
  onBackToDashboard: () => void;
}

export const BoardPasswordLockModal: React.FC<BoardPasswordLockModalProps> = ({
  isOpen,
  boardTitle,
  onUnlock,
  onBackToDashboard,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(false);

    try {
      const success = await onUnlock(password.trim());
      if (!success) {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
            <Lock className="size-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Quadro Protegido por Senha
          </h2>
          <p className="text-xs text-muted-foreground line-clamp-2">
            O proprietário de &quot;{boardTitle}&quot; definiu uma senha de segurança para acesso a este quadro.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Senha de Acesso
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="Digite a senha..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                className={`h-9 pr-9 text-sm transition-all ${
                  error ? 'border-destructive focus-visible:ring-destructive/30' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1 pt-0.5 animate-in fade-in duration-150">
                <AlertCircle className="size-3.5" />
                Senha incorreta. Tente novamente.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="submit"
              disabled={!password.trim() || loading}
              className="w-full h-9 text-xs font-semibold gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
            >
              <KeyRound className="size-3.5" />
              <span>{loading ? 'Verificando...' : 'Desbloquear Quadro'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onBackToDashboard}
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span>Voltar ao Workspace</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
