import React, { useState, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Trash2,
  ShieldCheck
} from 'lucide-react';
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
import type { Board } from '../../types/board';

interface BoardPasswordSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board | null;
  onSavePasswordSettings: (
    boardId: string, 
    settings: { isPasswordProtected: boolean; password?: string }
  ) => Promise<void>;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class PasswordModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado no Modal de Senha:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4">
          <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Não foi possível carregar a proteção por senha</h3>
            <p className="text-xs text-muted-foreground">Ocorreu um erro inesperado ao carregar as configurações.</p>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onClose();
            }}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const BoardPasswordSettingsModal: React.FC<BoardPasswordSettingsModalProps> = ({
  open,
  onOpenChange,
  board,
  onSavePasswordSettings,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (board && open) {
      setIsEnabled(Boolean(board.isPasswordProtected));
      setPassword(board.password || '');
      setShowPassword(false);
      setSuccessMessage(null);
      setError(null);
    }
  }, [board, open]);

  if (!board) return null;

  const currentHasPassword = Boolean(board.isPasswordProtected && board.password);

  const handleSave = async () => {
    if (isEnabled && !password.trim()) {
      setError('Por favor, informe uma senha válida.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSavePasswordSettings(board.id, {
        isPasswordProtected: isEnabled,
        password: isEnabled ? password.trim() : '',
      });

      setSuccessMessage(
        isEnabled 
          ? 'Senha configurada com sucesso!' 
          : 'Proteção por senha desativada.'
      );

      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      console.error('Erro ao atualizar configurações de senha:', err);
      setError('Ocorreu um erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePassword = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSavePasswordSettings(board.id, {
        isPasswordProtected: false,
        password: '',
      });

      setIsEnabled(false);
      setPassword('');
      setSuccessMessage('Senha removida com sucesso!');

      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      console.error('Erro ao remover senha:', err);
      setError('Ocorreu um erro ao remover a senha.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <PasswordModalErrorBoundary onClose={() => onOpenChange(false)}>
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                isEnabled 
                  ? 'bg-amber-500/10 text-amber-500 ring-4 ring-amber-500/5' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isEnabled ? <Lock className="size-5" /> : <Unlock className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>Proteção por Senha</span>
                  {currentHasPassword && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px] px-1.5 py-0 font-normal">
                      Ativa
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Quadro: <strong className="text-foreground">{board.title || 'Quadro'}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Card de Controle de Ativação / Toggle */}
            <div 
              onClick={() => {
                setIsEnabled(!isEnabled);
                setError(null);
              }}
              className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer select-none ${
                isEnabled 
                  ? 'border-amber-500/40 bg-amber-500/5' 
                  : 'border-border bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  Exigir senha para entrar
                </span>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Qualquer pessoa que acessar o link precisará digitar a senha para ver ou interagir com o quadro.
                </p>
              </div>

              {/* Custom Toggle Switch */}
              <div 
                role="switch" 
                aria-checked={isEnabled} 
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
                  isEnabled ? 'bg-amber-500' : 'bg-muted-foreground/30'
                }`}
              >
                <div 
                  className={`bg-white size-4 rounded-full shadow-md transform transition-transform duration-200 ease-out ${
                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} 
                />
              </div>
            </div>

            {/* Campo de Senha (ativo quando isEnabled = true) */}
            {isEnabled && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    placeholder="Defina a senha do quadro..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                    className={`h-9 pr-9 text-xs font-mono transition-all ${
                      error ? 'border-destructive focus-visible:ring-destructive/30' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5 cursor-pointer"
                    tabIndex={-1}
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>

                {currentHasPassword && board.password && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                    <span>
                      Senha atual salva: <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px] text-foreground">{board.password}</code>
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Mensagem de Erro */}
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg animate-in fade-in duration-150">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {successMessage && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg animate-in fade-in duration-150">
                <Check className="size-3.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2 border-t border-border/50">
            <div>
              {currentHasPassword ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePassword}
                  disabled={isSaving}
                  className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remover Senha</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="h-8 px-3 text-xs text-muted-foreground active:scale-[0.97] transition-transform cursor-pointer"
                >
                  Cancelar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentHasPassword && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="h-8 px-3 text-xs active:scale-[0.97] transition-transform cursor-pointer"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || (isEnabled && !password.trim())}
                className="h-8 px-3.5 text-xs font-semibold gap-1.5 active:scale-[0.97] transition-transform cursor-pointer"
              >
                {isSaving ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </PasswordModalErrorBoundary>
      </DialogContent>
    </Dialog>
  );
};
