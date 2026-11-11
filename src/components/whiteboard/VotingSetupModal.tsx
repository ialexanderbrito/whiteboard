import React, { useState } from 'react';
import { 
  Vote, 
  Clock, 
  CheckCircle2, 
  Layers, 
  StickyNote, 
  MousePointerClick,
  History,
  Play
} from '@/components/ui/icons';
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
import type { CurrentUser } from '@/types/board';
import type { VotingScope, VotingSessionConfig, VotingSession } from '@/services/votingService';

interface VotingSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: CurrentUser;
  selectedElementIds?: string[];
  lastSession?: VotingSession | null;
  onStartSession: (config: VotingSessionConfig) => Promise<void>;
  onOpenResults?: () => void;
}

const DEFAULT_VOTE_COUNTS = [1, 3, 5, 10];
const DEFAULT_DURATIONS = [1, 2, 3, 5, 10];

export const VotingSetupModal: React.FC<VotingSetupModalProps> = ({
  open,
  onOpenChange,
  currentUser: _currentUser,
  selectedElementIds = [],
  lastSession,
  onStartSession,
  onOpenResults,
}) => {
  const [title, setTitle] = useState('Votação');
  const [votesPerPerson, setVotesPerPerson] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [scope, setScope] = useState<VotingScope>('all');
  const [loading, setLoading] = useState(false);

  const hasSelection = selectedElementIds.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await onStartSession({
        title: title.trim() || 'Votação',
        votesPerPerson: Math.max(1, votesPerPerson),
        durationMinutes: Math.max(1, durationMinutes),
        scope,
        allowedElementIds: scope === 'selection' ? (selectedElementIds || []) : [],
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6 gap-5 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-primary/5">
                <Vote className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  <span>Sessão de Votação</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Distribua votos entre os participantes em tempo cronometrado
                </DialogDescription>
              </div>
            </div>

            {lastSession && onOpenResults && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenResults();
                }}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
              >
                <History className="size-3.5" />
                <span>Último Placar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Título do Tópico */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              <span>Tópico da Votação</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Priorização de Features, Melhor Ideia..."
              className="h-9 text-xs"
              maxLength={80}
              required
            />
          </div>

          {/* 2. Votos por Pessoa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Votos por Participante
              </label>
              <span className="text-xs font-bold text-primary">
                {votesPerPerson} {votesPerPerson === 1 ? 'voto' : 'votos'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_VOTE_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setVotesPerPerson(count)}
                  className={`h-9 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${
                    votesPerPerson === count
                      ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span>{count}</span>
                  <span className="text-[10px] font-normal">{count === 1 ? 'voto' : 'votos'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Duração da Votação */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <span>Tempo de Votação</span>
              </label>
              <span className="text-xs font-bold text-primary font-mono">
                {durationMinutes} {durationMinutes === 1 ? 'minuto' : 'minutos'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {DEFAULT_DURATIONS.map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDurationMinutes(min)}
                  className={`h-9 rounded-lg text-xs font-bold border transition flex items-center justify-center ${
                    durationMinutes === min
                      ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          {/* 4. Onde Votar (Escopo dos Elementos) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              O que pode ser votado?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Opção: Todo o Quadro */}
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                  scope === 'all'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  <span className="text-xs font-bold">Todo o Quadro</span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Qualquer elemento
                </span>
              </button>

              {/* Opção: Post-its e Formas */}
              <button
                type="button"
                onClick={() => setScope('sticky_only')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                  scope === 'sticky_only'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <StickyNote className="size-3.5" />
                  <span className="text-xs font-bold">Post-its & Formas</span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Ideal para ideação
                </span>
              </button>

              {/* Opção: Apenas Selecionados */}
              <button
                type="button"
                disabled={!hasSelection}
                onClick={() => hasSelection && setScope('selection')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                  !hasSelection
                    ? 'opacity-40 cursor-not-allowed border-dashed border-border bg-card'
                    : scope === 'selection'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <MousePointerClick className="size-3.5" />
                  <span className="text-xs font-bold">Selecionados</span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {hasSelection ? `${selectedElementIds.length} selecionados` : 'Nenhum selecionado'}
                </span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Votos Privados:</strong> Durante a votação ativa, cada participante enxerga apenas os seus próprios votos. Os resultados completos só aparecem no pódio ao encerrar a sessão.
            </span>
          </div>

          <DialogFooter className="pt-2 sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs h-9 rounded-xl font-bold gap-2 px-5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <Play className="size-3.5 fill-current" />
              <span>{loading ? 'Iniciando...' : 'Iniciar Votação'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
