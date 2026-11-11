import React, { useEffect } from 'react';
import {
  Trophy,
  RotateCcw,
  Info,
  Plus,
  Crown,
  Users,
} from '@/components/ui/icons';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CanvasElement } from '@/types/element';
import type { BoardVotingData } from '@/services/votingService';
import { votingService } from '@/services/votingService';
import { getContrastTextColor } from '@/utils/colors';
import { playChimeSound } from '@/utils/audioChime';

interface VotingLeaderboardModalProps {
  boardId: string;
  votingData: BoardVotingData | null;
  elements: CanvasElement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFocusElement?: (elementId: string) => void;
  onStartNewSession?: () => void;
  canManage?: boolean;
}

interface ElementDisplayInfo {
  title: string;
  fillColor: string;
  textColor: string;
  type: string;
  previewImage?: string;
}

function getElementDisplayInfo(elem: CanvasElement | undefined): ElementDisplayInfo {
  if (!elem) {
    return {
      title: 'Item removido do quadro',
      fillColor: '#f1f5f9',
      textColor: '#64748b',
      type: 'unknown',
    };
  }

  const fill = elem.fill || (elem.type === 'sticky' ? '#fff9b1' : '#ffffff');
  const rawText = (elem.text || '').trim();
  const typeLabel: Record<string, string> = {
    sticky: 'Post-it',
    rect: 'Retângulo',
    circle: 'Círculo',
    diamond: 'Losango',
    triangle: 'Triângulo',
    star: 'Estrela',
    text: 'Texto',
    sticker: 'Sticker',
    gif: 'GIF',
  };

  return {
    title: rawText || `${typeLabel[elem.type] || 'Elemento'} (sem texto)`,
    fillColor: fill === 'transparent' ? '#f8fafc' : fill,
    textColor: getContrastTextColor(fill),
    type: elem.type,
    previewImage: elem.src,
  };
}

/**
 * Miniatura compacta do elemento para identificação imediata
 */
const ElementThumbnail: React.FC<{
  info: ElementDisplayInfo;
  className?: string;
}> = ({ info, className = '' }) => {
  if (info.previewImage) {
    return (
      <div className={`relative rounded-md overflow-hidden border border-border shadow-xs shrink-0 flex items-center justify-center bg-card ${className}`}>
        <img
          src={info.previewImage}
          alt={info.title}
          className="size-full object-contain p-0.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-md border border-black/10 shadow-xs shrink-0 p-1 overflow-hidden select-none flex items-start ${className}`}
      style={{
        backgroundColor: info.fillColor,
        color: info.textColor,
      }}
    >
      {info.type === 'sticky' && (
        <div className="absolute top-0 right-0 size-2 bg-black/10 rounded-bl-sm" />
      )}
      <p className="text-[8px] font-medium leading-tight line-clamp-3 w-full">
        {info.title}
      </p>
    </div>
  );
};

export const VotingLeaderboardModal: React.FC<VotingLeaderboardModalProps> = ({
  boardId,
  votingData,
  elements,
  open,
  onOpenChange,
  onFocusElement,
  onStartNewSession,
  canManage = true,
}) => {
  const session = votingData?.session;

  // Agrega os votos por elemento
  const voteAggregates = new Map<string, number>();
  let totalVotesCast = 0;
  const participantSet = new Set<string>();

  if (session?.votes) {
    Object.entries(session.votes).forEach(([uid, userMap]) => {
      Object.entries(userMap).forEach(([elemId, count]) => {
        if (count > 0) {
          totalVotesCast += count;
          participantSet.add(uid);
          voteAggregates.set(elemId, (voteAggregates.get(elemId) || 0) + count);
        }
      });
    });
  } else if (votingData?.votesByUser) {
    Object.values(votingData.votesByUser).forEach((vote) => {
      totalVotesCast += 1;
      participantSet.add(vote.uid);
      voteAggregates.set(vote.elementId, (voteAggregates.get(vote.elementId) || 0) + 1);
    });
  }

  const elementMap = new Map(elements.map((el) => [el.id, el]));

  const voteEntries = Array.from(voteAggregates.entries())
    .map(([elementId, count]) => ({
      elementId,
      element: elementMap.get(elementId),
      displayInfo: getElementDisplayInfo(elementMap.get(elementId)),
      count,
      percent: totalVotesCast > 0 ? Math.round((count / totalVotesCast) * 100) : 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  const winner = voteEntries[0];
  const runners = voteEntries.slice(1);

  useEffect(() => {
    if (open && totalVotesCast > 0) {
      playChimeSound();
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.3 },
        });
      } catch {}
    }
  }, [open, totalVotesCast]);

  const handleClearAllVotes = async () => {
    await votingService.resetSession(boardId);
  };

  const handleFocus = (elementId: string) => {
    onFocusElement?.(elementId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 rounded-2xl shadow-2xl border-border bg-card overflow-hidden">
        {/* Cabeçalho compacto */}
        <DialogHeader className="flex-row items-center gap-3 p-5 pb-4 pr-12 border-b border-border/60 space-y-0">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
            <Trophy className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-bold truncate">
              {session?.title || 'Votação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{session?.status === 'ended' ? 'Resultado final' : 'Resultado parcial'}</span>
              <span className="text-border">•</span>
              <span className="font-mono font-semibold text-foreground">{totalVotesCast} votos</span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {participantSet.size}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {voteEntries.length > 0 ? (
          <div className="flex flex-col min-h-0 max-h-[65vh]">
            {/* Vencedor */}
            {winner && (
              <button
                type="button"
                onClick={() => handleFocus(winner.elementId)}
                title="Clique para localizar no quadro"
                className="flex items-center gap-3 mx-5 mt-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15 transition text-left cursor-pointer"
              >
                <Crown className="size-5 text-amber-500 shrink-0" strokeWidth={2} />

                <ElementThumbnail info={winner.displayInfo} className="size-11" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground line-clamp-2 leading-tight">
                    {winner.displayInfo.title}
                  </p>
                  <p className="text-[10px] font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                    {winner.count} {winner.count === 1 ? 'voto' : 'votos'} • {winner.percent}%
                  </p>
                </div>
              </button>
            )}

            {/* Demais itens classificados */}
            {runners.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3 space-y-0.5">
                {runners.map((item, index) => (
                  <button
                    key={item.elementId}
                    type="button"
                    onClick={() => handleFocus(item.elementId)}
                    title="Clique para localizar no quadro"
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left cursor-pointer group"
                  >
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground w-5 text-center shrink-0">
                      {index + 2}
                    </span>

                    <ElementThumbnail info={item.displayInfo} className="size-9" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate leading-tight">
                        {item.displayInfo.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="h-1 flex-1 max-w-20 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                          {item.percent}%
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-foreground shrink-0 tabular-nums">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Rodapé com ações */}
            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border/60">
              {canManage && onStartNewSession ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onStartNewSession();
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-lg"
                >
                  <Plus className="size-3.5" />
                  <span>Nova Votação</span>
                </Button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-1">
                {canManage && totalVotesCast > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllVotes}
                    className="h-8 size-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg p-0"
                    title="Limpar resultados da votação"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 text-xs font-semibold cursor-pointer rounded-lg px-4"
                >
                  <span>Fechar</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 max-h-[65vh]">
            <div className="flex-1 py-10 text-center space-y-3">
              <div className="size-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Info className="size-5" />
              </div>
              <div className="space-y-1 px-6">
                <p className="text-sm font-semibold text-foreground">Nenhum voto registrado</p>
                <p className="text-xs text-muted-foreground">
                  Inicie uma sessão de votação para que os participantes distribuam seus votos.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border/60">
              {canManage && onStartNewSession ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onStartNewSession();
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-lg"
                >
                  <Plus className="size-3.5" />
                  <span>Nova Votação</span>
                </Button>
              ) : (
                <span />
              )}

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs font-semibold cursor-pointer rounded-lg px-4"
              >
                <span>Fechar</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
