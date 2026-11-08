import React, { useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  Info,
  Crosshair,
  Plus,
  StickyNote,
  Square,
  Circle,
  Type,
  MapPin,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CanvasElement } from '@/types/element';
import type { BoardVotingData } from '@/services/votingService';
import { votingService } from '@/services/votingService';
import { STICKY_COLORS, SHAPE_FILL_COLORS, getContrastTextColor } from '@/utils/colors';
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
  subtitle: string;
  typeLabel: string;
  colorName: string;
  fillColor: string;
  textColor: string;
  hasText: boolean;
  type: string;
  previewImage?: string;
}

function getElementDisplayInfo(elem: CanvasElement | undefined): ElementDisplayInfo {
  if (!elem) {
    return {
      title: 'Item removido do quadro',
      subtitle: 'Este elemento não está mais presente no canvas',
      typeLabel: 'Elemento',
      colorName: '',
      fillColor: '#f1f5f9',
      textColor: '#64748b',
      hasText: false,
      type: 'unknown',
    };
  }

  const fill = elem.fill || (elem.type === 'sticky' ? '#fff9b1' : '#ffffff');
  const matchedSticky = STICKY_COLORS.find(c => c.value.toLowerCase() === fill.toLowerCase());
  const matchedShape = SHAPE_FILL_COLORS.find(c => c.value.toLowerCase() === fill.toLowerCase());
  const colorName = matchedSticky?.name || matchedShape?.name || '';

  const typeMap: Record<string, string> = {
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
  const typeLabel = typeMap[elem.type] || 'Elemento';

  const rawText = (elem.text || '').trim();
  const hasText = rawText.length > 0;

  let title = '';
  let subtitle = '';

  if (hasText) {
    title = rawText;
    subtitle = `${typeLabel}${colorName ? ` • ${colorName}` : ''}`;
  } else {
    title = colorName ? `${typeLabel} ${colorName}` : `${typeLabel} (Sem texto)`;
    subtitle = 'Sem texto digitado no elemento';
  }

  const textColor = elem.type === 'sticky' && matchedSticky && 'text' in matchedSticky
    ? (matchedSticky as any).text
    : getContrastTextColor(fill);

  return {
    title,
    subtitle,
    typeLabel,
    colorName,
    fillColor: fill,
    textColor,
    hasText,
    type: elem.type,
    previewImage: elem.src,
  };
}

/**
 * Miniatura visual realista do elemento para identificação imediata
 */
const ElementThumbnail: React.FC<{
  info: ElementDisplayInfo;
  className?: string;
}> = ({ info, className = '' }) => {
  if (info.previewImage) {
    return (
      <div className={`relative rounded-lg overflow-hidden border border-border shadow-xs shrink-0 flex items-center justify-center bg-card ${className}`}>
        <img
          src={info.previewImage}
          alt={info.title}
          className="size-full object-contain p-1"
        />
      </div>
    );
  }

  if (info.type === 'sticky') {
    return (
      <div
        className={`relative rounded-md shadow-sm border border-black/10 shrink-0 p-1 flex flex-col justify-between overflow-hidden select-none transition-transform ${className}`}
        style={{
          backgroundColor: info.fillColor,
          color: info.textColor,
        }}
      >
        {/* Dobra de canto sutil do post-it */}
        <div className="absolute top-0 right-0 size-2.5 bg-black/10 rounded-bl-sm" />

        <div className="flex items-center gap-1 opacity-70">
          <StickyNote className="size-2.5 shrink-0" />
          <span className="text-[8px] font-bold uppercase tracking-wider truncate">
            {info.colorName || 'Post-it'}
          </span>
        </div>

        <p className="text-[9px] font-medium leading-tight line-clamp-2 px-0.5">
          {info.hasText ? info.title : '—'}
        </p>
      </div>
    );
  }

  // Formas e Texto
  return (
    <div
      className={`relative rounded-md border border-border/80 shadow-xs shrink-0 p-1 flex items-center justify-center select-none ${className}`}
      style={{
        backgroundColor: info.fillColor === 'transparent' ? '#f8fafc' : info.fillColor,
        color: info.textColor,
      }}
    >
      {info.type === 'circle' ? (
        <Circle className="size-4 opacity-70" />
      ) : info.type === 'text' ? (
        <Type className="size-4 opacity-70" />
      ) : (
        <Square className="size-4 opacity-70" />
      )}
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

  // Mapeia e agrupa os votos por elemento
  const elementMap = new Map(elements.map((el) => [el.id, el]));
  const voteAggregates = new Map<string, { count: number; voters: string[] }>();
  let totalVotesCast = 0;
  const participantSet = new Set<string>();

  if (session && session.votes) {
    Object.entries(session.votes).forEach(([uid, userMap]) => {
      const userName = session.userNames?.[uid] || 'Participante';
      Object.entries(userMap).forEach(([elemId, count]) => {
        if (count > 0) {
          totalVotesCast += count;
          participantSet.add(uid);
          if (!voteAggregates.has(elemId)) {
            voteAggregates.set(elemId, { count: 0, voters: [] });
          }
          const agg = voteAggregates.get(elemId)!;
          agg.count += count;
          agg.voters.push(`${userName} (${count})`);
        }
      });
    });
  } else if (votingData?.votesByUser) {
    Object.values(votingData.votesByUser).forEach((vote) => {
      totalVotesCast += 1;
      participantSet.add(vote.uid);
      if (!voteAggregates.has(vote.elementId)) {
        voteAggregates.set(vote.elementId, { count: 0, voters: [] });
      }
      const agg = voteAggregates.get(vote.elementId)!;
      agg.count += 1;
      agg.voters.push(vote.name);
    });
  }

  const voteEntries = Array.from(voteAggregates.entries())
    .map(([elementId, { count, voters }]) => {
      const elem = elementMap.get(elementId);
      const displayInfo = getElementDisplayInfo(elem);
      return {
        elementId,
        element: elem,
        displayInfo,
        voters,
        count,
        percent: totalVotesCast > 0 ? Math.round((count / totalVotesCast) * 100) : 0,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

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
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto p-5 sm:p-6 gap-4 rounded-2xl shadow-2xl border-border bg-card">
        <DialogHeader className="space-y-1 pr-10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 ring-2 ring-amber-500/10 shrink-0">
              <Trophy className="size-4.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span className="truncate">{session?.title || 'Votação'}</span>
                <Sparkles className="size-3.5 text-amber-500 shrink-0" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{session?.status === 'ended' ? 'Votação Concluída' : 'Resultado'}</span>
                <span>•</span>
                <span className="font-semibold text-foreground font-mono">
                  {totalVotesCast} {totalVotesCast === 1 ? 'voto total' : 'votos totais'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {participantSet.size} {participantSet.size === 1 ? 'participante' : 'participantes'}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {voteEntries.length > 0 ? (
          <div className="space-y-4 pt-1">
            {/* 1. Pódio Visual Realista dos 3 Primeiros Colocados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              {/* 2º Lugar */}
              <div className="order-2 sm:order-1 flex flex-col justify-end">
                {voteEntries[1] ? (
                  <div
                    onClick={() => handleFocus(voteEntries[1].elementId)}
                    className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-muted/30 hover:bg-muted/60 transition cursor-pointer flex flex-col items-center text-center space-y-2 relative group hover:shadow-md"
                    title="Clique para localizar e dar zoom no quadro"
                  >
                    <div className="size-7 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-black shadow-xs">
                      🥈 2º
                    </div>

                    {/* Miniatura Realista */}
                    <ElementThumbnail info={voteEntries[1].displayInfo} className="size-16" />

                    <div className="space-y-0.5 w-full">
                      <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                        {voteEntries[1].displayInfo.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {voteEntries[1].displayInfo.subtitle}
                      </p>
                    </div>

                    <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5">
                      {voteEntries[1].count} {voteEntries[1].count === 1 ? 'voto' : 'votos'}
                    </Badge>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 rounded-lg gap-1 text-primary border-primary/30 w-full"
                    >
                      <Crosshair className="size-2.5" />
                      <span>Ver no Quadro</span>
                    </Button>
                  </div>
                ) : (
                  <div className="h-32 rounded-2xl border border-dashed border-border/50 flex items-center justify-center text-[11px] text-muted-foreground/60">
                    Sem 2º colocado
                  </div>
                )}
              </div>

              {/* 1º Lugar (Campeão) */}
              <div className="order-1 sm:order-2 flex flex-col justify-end">
                {voteEntries[0] && (
                  <div
                    onClick={() => handleFocus(voteEntries[0].elementId)}
                    className="p-4 rounded-2xl border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/15 shadow-lg flex flex-col items-center text-center space-y-2 relative ring-4 ring-amber-500/15 cursor-pointer group transition hover:scale-[1.01]"
                    title="Clique para localizar e dar zoom no quadro"
                  >
                    <div className="size-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
                      👑 1º
                    </div>

                    {/* Miniatura Realista */}
                    <ElementThumbnail info={voteEntries[0].displayInfo} className="size-20" />

                    <div className="space-y-0.5 w-full">
                      <p className="text-sm font-bold text-foreground line-clamp-2 leading-tight">
                        {voteEntries[0].displayInfo.title}
                      </p>
                      <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium truncate">
                        {voteEntries[0].displayInfo.subtitle}
                      </p>
                    </div>

                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-mono font-black px-3 py-0.5 shadow-xs">
                      {voteEntries[0].count} {voteEntries[0].count === 1 ? 'voto' : 'votos'} ({voteEntries[0].percent}%)
                    </Badge>

                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-2.5 rounded-lg gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold w-full shadow-xs"
                    >
                      <Crosshair className="size-3" />
                      <span>Localizar no Quadro</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* 3º Lugar */}
              <div className="order-3 flex flex-col justify-end">
                {voteEntries[2] ? (
                  <div
                    onClick={() => handleFocus(voteEntries[2].elementId)}
                    className="p-3 rounded-2xl border border-amber-800/30 bg-muted/30 hover:bg-muted/60 transition cursor-pointer flex flex-col items-center text-center space-y-2 relative group hover:shadow-md"
                    title="Clique para localizar e dar zoom no quadro"
                  >
                    <div className="size-7 rounded-full bg-amber-800/20 text-amber-800 dark:text-amber-400 flex items-center justify-center text-xs font-black shadow-xs">
                      🥉 3º
                    </div>

                    {/* Miniatura Realista */}
                    <ElementThumbnail info={voteEntries[2].displayInfo} className="size-16" />

                    <div className="space-y-0.5 w-full">
                      <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                        {voteEntries[2].displayInfo.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {voteEntries[2].displayInfo.subtitle}
                      </p>
                    </div>

                    <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5">
                      {voteEntries[2].count} {voteEntries[2].count === 1 ? 'voto' : 'votos'}
                    </Badge>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 rounded-lg gap-1 text-primary border-primary/30 w-full"
                    >
                      <Crosshair className="size-2.5" />
                      <span>Ver no Quadro</span>
                    </Button>
                  </div>
                ) : (
                  <div className="h-32 rounded-2xl border border-dashed border-border/50 flex items-center justify-center text-[11px] text-muted-foreground/60">
                    Sem 3º colocado
                  </div>
                )}
              </div>
            </div>

            {/* 2. Lista Completa de Classificação com Miniaturas e Detalhes */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Classificação Completa ({voteEntries.length} itens com votos)
              </span>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {voteEntries.map((item, index) => (
                  <div
                    key={item.elementId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-card/60 hover:bg-muted/40 transition-colors"
                  >
                    {/* Lado Esquerdo: Miniatura Real + Textos Claros */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-muted-foreground w-6 text-center shrink-0">
                        #{index + 1}
                      </span>

                      {/* Miniatura do Elemento */}
                      <ElementThumbnail info={item.displayInfo} className="size-12 shrink-0" />

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate max-w-[280px]">
                            {item.displayInfo.title}
                          </p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 font-medium border-border/80">
                            {item.displayInfo.typeLabel}
                            {item.displayInfo.colorName ? ` • ${item.displayInfo.colorName}` : ''}
                          </Badge>
                        </div>

                        {/* Votantes */}
                        {item.voters.length > 0 && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[320px]">
                            <span className="font-semibold">Votos de:</span> {item.voters.join(', ')}
                          </p>
                        )}

                        {/* Barra de Progresso de Participação nos Votos */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="w-24 sm:w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Quantidade de Votos e Botão de Foco */}
                    <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                      <Badge className="font-mono text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                        {item.count} {item.count === 1 ? 'voto' : 'votos'}
                      </Badge>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFocus(item.elementId)}
                        className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                        title="Localizar e centralizar este elemento no quadro"
                      >
                        <MapPin className="size-3.5" />
                        <span>Focar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center space-y-3 bg-muted/20 rounded-2xl border border-border/60">
            <div className="size-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Info className="size-6" />
            </div>
            <div className="space-y-1 px-4">
              <p className="text-sm font-semibold text-foreground">Nenhum voto registrado ainda</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Inicie uma sessão de votação para que os participantes distribuam seus votos nos itens do quadro!
              </p>
            </div>
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border mt-1">
          <div className="flex items-center gap-2">
            {canManage && onStartNewSession && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onStartNewSession();
                }}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl"
              >
                <Plus className="size-3.5" />
                <span>Nova Votação</span>
              </Button>
            )}

            {canManage && totalVotesCast > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAllVotes}
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer rounded-xl"
                title="Limpar resultados da votação"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Limpar Placar</span>
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl px-4"
          >
            <CheckCircle2 className="size-3.5" />
            <span>Fechar</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
