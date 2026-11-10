import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  RotateCw, 
  ArrowLeft, 
  Sparkles
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Board, CurrentUser } from '@/types/board';
import { boardService } from '@/services/boardService';

interface WaitingRoomScreenProps {
  board: Board;
  currentUser: CurrentUser;
  onBackToDashboard: () => void;
}

const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({
  board,
  currentUser,
  onBackToDashboard,
}) => {
  const currentRequest = board.joinRequests?.[currentUser.uid];
  const requestStatus = currentRequest?.status || 'pending';

  // Cooldown de re-tentativa quando rejeitado (120 segundos)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    if (requestStatus === 'rejected' && currentRequest?.respondedAt) {
      const elapsed = Math.floor((Date.now() - currentRequest.respondedAt) / 1000);
      return Math.max(0, 120 - elapsed);
    }
    return 0;
  });

  const [isRetrying, setIsRetrying] = useState(false);
  const hasAutoRequestedRef = useRef(false);

  // Envia a solicitação de entrada automaticamente ao carregar a tela, caso ainda não exista
  useEffect(() => {
    if (!currentRequest && !hasAutoRequestedRef.current) {
      hasAutoRequestedRef.current = true;
      boardService.requestBoardAccess(board.id, currentUser).catch((err) => {
        console.warn('Falha ao registrar solicitação inicial na Sala de Espera:', err);
      });
    }
  }, [board.id, currentUser, currentRequest]);

  // Atualiza cooldown regressivo quando rejeitado
  useEffect(() => {
    if (requestStatus !== 'rejected') {
      setCooldownRemaining(0);
      return;
    }

    if (currentRequest?.respondedAt) {
      const elapsed = Math.floor((Date.now() - currentRequest.respondedAt) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setCooldownRemaining(remaining);
    }

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [requestStatus, currentRequest?.respondedAt]);

  const handleRetryRequest = async () => {
    if (cooldownRemaining > 0 || isRetrying) return;
    setIsRetrying(true);
    try {
      await boardService.requestBoardAccess(board.id, currentUser);
    } catch (err) {
      console.error('Erro ao reenviar solicitação:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isRejected = requestStatus === 'rejected';

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center select-none overflow-hidden">
      {/* Grade de fundo suave com vinheta atmosférica */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-t from-background via-transparent to-background/80" />

      {/* Card Central Glassmórfico com acabamento refinado */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Radar / Sonar de espera animado estilo Emil Kowalski */}
        <div className="relative mx-auto size-20 flex items-center justify-center">
          {!isRejected ? (
            <>
              {/* Anéis pulsantes concêntricos */}
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-60" style={{ animationDuration: '2.5s' }} />
              <span className="absolute inset-2 rounded-full bg-primary/15 animate-pulse" style={{ animationDuration: '1.8s' }} />
              <div className="relative size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                <Clock className="size-7 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
            </>
          ) : (
            <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-inner">
              <ShieldAlert className="size-8" />
            </div>
          )}
        </div>

        {/* Título e Explicação estritamente em conformidade com privacidade / LGPD */}
        <div className="space-y-2">
          <Badge 
            variant="outline" 
            className="px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase bg-muted/50 border-border/80 text-muted-foreground gap-1.5 inline-flex items-center"
          >
            <Sparkles className="size-3 text-primary" />
            Sala de Espera
          </Badge>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isRejected ? 'Entrada não autorizada' : 'Aguardando aprovação'}
          </h2>

          <p className="text-xs text-muted-foreground leading-relaxed px-2">
            {isRejected ? (
              <>
                Sua solicitação de acesso não foi aprovada pelo proprietário do quadro.
              </>
            ) : (
              <>
                Aguardando aprovação do proprietário ao quadro...
              </>
            )}
          </p>
        </div>

        {/* Cartão de Identidade apenas do próprio visitante solicitante */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-left">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-border/80 shadow-sm shrink-0">
              {currentUser.photoURL && <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName} />}
              <AvatarFallback 
                className="text-xs font-semibold text-white" 
                style={{ backgroundColor: currentUser.color || '#3b82f6' }}
              >
                {getInitials(currentUser.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {currentUser.displayName}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-medium">
                  Você
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentUser.email || (currentUser.isAnonymous ? 'Convidado via link' : 'Usuário')}
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2 pt-2">
          {isRejected && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={cooldownRemaining > 0 || isRetrying}
              onClick={handleRetryRequest}
              className="w-full text-xs font-medium transition-transform duration-150 active:scale-[0.97]"
            >
              <RotateCw className={`size-3.5 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {cooldownRemaining > 0 
                ? `Tentar novamente em ${formatCooldown(cooldownRemaining)}` 
                : 'Pedir permissão novamente'}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToDashboard}
            className="w-full text-xs font-medium border-border/80 text-muted-foreground hover:text-foreground transition-transform duration-150 active:scale-[0.97]"
          >
            <ArrowLeft className="size-3.5 mr-1.5" />
            Voltar ao Workspace
          </Button>
        </div>

      </div>
    </div>
  );
};
