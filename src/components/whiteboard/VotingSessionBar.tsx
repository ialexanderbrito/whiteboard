import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Clock, 
  CheckCircle2, 
  SquareCheck, 
  StopCircle, 
  ChevronUp, 
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VotingSession } from '@/services/votingService';
import { votingService } from '@/services/votingService';
import type { CurrentUser } from '@/types/board';

interface VotingSessionBarProps {
  session: VotingSession;
  currentUser: CurrentUser;
  canManageSession: boolean;
  onEndSession: () => void;
  onToggleComplete: () => void;
}

export const VotingSessionBar: React.FC<VotingSessionBarProps> = ({
  session,
  currentUser,
  canManageSession,
  onEndSession,
  onToggleComplete,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Calcula tempo restante sincronizado
  useEffect(() => {
    const updateCountdown = () => {
      if (!session.endsAt) {
        setSecondsRemaining(0);
        return;
      }
      const now = Date.now();
      const left = Math.max(0, Math.ceil((session.endsAt - now) / 1000));
      setSecondsRemaining(left);

      // Auto-encerra quando o tempo expira
      if (left <= 0 && session.status === 'active' && canManageSession) {
        onEndSession();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session.endsAt, session.status, canManageSession, onEndSession]);

  const allocatedVotes = votingService.getUserAllocatedVotes(session, currentUser.uid);
  const remainingVotes = Math.max(0, session.votesPerPerson - allocatedVotes);
  const isDone = Boolean(session.completedUsers?.[currentUser.uid]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 30;

  if (isMinimized) {
    return (
      <div className="pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-xs font-bold transition cursor-pointer ${
            isUrgent
              ? 'bg-red-500/90 text-white border-red-600 animate-pulse'
              : 'bg-card/95 text-foreground border-border hover:bg-card'
          }`}
        >
          <Vote className="size-3.5 text-primary" />
          <span className="font-mono">{formatTime(secondsRemaining)}</span>
          <span className="text-[10px] text-muted-foreground font-normal">
            ({remainingVotes} {remainingVotes === 1 ? 'voto restante' : 'votos restantes'})
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200 max-w-[96vw]">
      <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl text-foreground select-none max-w-full overflow-hidden">
        {/* 1. Título & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2.5 border-r border-border/60 shrink-0">
          <div className="size-7 sm:size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Vote className="size-3.5 sm:size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" title={session.title || 'Votação'}>
                {session.title || 'Votação'}
              </span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate hidden xs:inline max-w-[85px] sm:max-w-[120px]">
              {session.scope === 'selection'
                ? 'Selecionados'
                : session.scope === 'sticky_only'
                ? 'Post-its/Formas'
                : 'Todo o quadro'}
            </span>
          </div>
        </div>

        {/* 2. Cronômetro */}
        <div className="flex items-center gap-1 px-1 sm:px-1.5 shrink-0">
          <Clock className={`size-3 sm:size-3.5 ${isUrgent ? 'text-red-500 animate-bounce' : 'text-muted-foreground'}`} />
          <span
            className={`font-mono text-xs sm:text-sm font-extrabold tracking-tight tabular-nums ${
              isUrgent ? 'text-red-500 animate-pulse' : 'text-foreground'
            }`}
          >
            {formatTime(secondsRemaining)}
          </span>
        </div>

        <div className="w-px h-4 sm:h-5 bg-border/60 shrink-0" />

        {/* 3. Saldo de Votos do Participante */}
        <div className="flex items-center gap-1.5 px-1 sm:px-2 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span className="text-muted-foreground hidden sm:inline">Votos:</span>
              <span className="font-bold text-foreground font-mono">
                {allocatedVotes}/{session.votesPerPerson}
              </span>
              {remainingVotes === 0 && (
                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 border-emerald-500 text-emerald-600 bg-emerald-500/10 shrink-0">
                  Esgotados
                </Badge>
              )}
            </div>

            {/* Marcadores visuais de bolinhas de voto (Visível apenas a partir de md para não quebrar a tela) */}
            <div className="hidden md:flex items-center gap-0.5 mt-0.5">
              {Array.from({ length: Math.min(session.votesPerPerson, 10) }).map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 sm:size-2 rounded-full transition-all duration-200 ${
                    i < allocatedVotes
                      ? 'bg-primary ring-1 ring-primary/40 scale-105'
                      : 'bg-muted-foreground/30 border border-border'
                  }`}
                  title={i < allocatedVotes ? 'Voto usado' : 'Voto disponível'}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="w-px h-4 sm:h-5 bg-border/60 shrink-0" />

        {/* 4. Ações: Concluir / Encerrar */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant={isDone ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleComplete}
            className={`h-6 sm:h-7 px-2 sm:px-2.5 text-xs rounded-lg font-semibold gap-1 transition active:scale-95 cursor-pointer ${
              isDone
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-border text-foreground hover:bg-muted'
            }`}
            title="Sinalize que concluiu seus votos"
          >
            {isDone ? (
              <>
                <CheckCircle2 className="size-3 sm:size-3.5" />
                <span className="hidden sm:inline">Pronto</span>
              </>
            ) : (
              <>
                <SquareCheck className="size-3 sm:size-3.5" />
                <span className="hidden sm:inline">Concluir</span>
              </>
            )}
          </Button>

          {canManageSession && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onEndSession}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-xs rounded-lg font-semibold gap-1 shadow-xs cursor-pointer"
              title="Encerrar votação para todos e revelar o placar"
            >
              <StopCircle className="size-3 sm:size-3.5" />
              <span className="hidden sm:inline">Encerrar</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsMinimized(true)}
            className="size-6 sm:size-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
            title="Minimizar barra"
          >
            <ChevronUp className="size-3 sm:size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
