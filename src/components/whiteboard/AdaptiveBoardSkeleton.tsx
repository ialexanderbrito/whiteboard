import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface DashboardAdaptiveSnapshot {
  viewMode: 'grid' | 'table';
  count: number;
  lastUpdated: number;
}

const SNAPSHOT_KEY = 'mirio_dashboard_adaptive_state';

/**
 * Recupera o último estado salvo da tela do dashboard (modo de visão e quantidade de quadros).
 * Se não houver histórico, assume grid com 4 itens como ponto de partida agradável.
 */
export function getAdaptiveSnapshot(userId?: string): DashboardAdaptiveSnapshot {
  if (typeof window === 'undefined') {
    return { viewMode: 'grid', count: 4, lastUpdated: Date.now() };
  }

  try {
    const userKey = userId ? `${SNAPSHOT_KEY}_${userId}` : null;
    const raw = (userKey && localStorage.getItem(userKey)) || localStorage.getItem(SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const viewMode: 'grid' | 'table' = parsed.viewMode === 'table' ? 'table' : 'grid';
      const rawCount = typeof parsed.count === 'number' ? parsed.count : 4;
      // Garante quantidade adaptativa realista entre 1 e 16 itens
      const count = Math.min(Math.max(rawCount, 1), 16);
      return {
        viewMode,
        count,
        lastUpdated: parsed.lastUpdated || Date.now(),
      };
    }
  } catch {}

  return { viewMode: 'grid', count: 4, lastUpdated: Date.now() };
}

/**
 * Persiste instantaneamente a última configuração da tela (modo de visualização e quantidade de quadros).
 */
export function saveAdaptiveSnapshot(
  snapshot: Partial<DashboardAdaptiveSnapshot>,
  userId?: string
): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getAdaptiveSnapshot(userId);
    const updated: DashboardAdaptiveSnapshot = {
      ...current,
      ...snapshot,
      lastUpdated: Date.now(),
    };

    const serialized = JSON.stringify(updated);
    if (userId) {
      localStorage.setItem(`${SNAPSHOT_KEY}_${userId}`, serialized);
    }
    localStorage.setItem(SNAPSHOT_KEY, serialized);
  } catch {}
}

interface AdaptiveBoardSkeletonProps {
  viewMode: 'grid' | 'table';
  count?: number;
}

// Variações de largura para simular títulos reais e evitar efeito repetitivo artificial
const TITLE_WIDTH_CLASSES = [
  'w-3/5',
  'w-4/5',
  'w-2/3',
  'w-3/4',
  'w-1/2',
  'w-5/6',
];

export const AdaptiveBoardSkeleton: React.FC<AdaptiveBoardSkeletonProps> = ({
  viewMode,
  count = 4,
}) => {
  // Quantidade de itens segura para exibição
  const safeCount = Math.min(Math.max(count || 4, 1), 16);
  const items = Array.from({ length: safeCount });

  if (viewMode === 'table') {
    return (
      <div 
        className="rounded-md border border-border bg-card overflow-hidden animate-in fade-in duration-200"
        aria-label="Carregando quadros em tabela..."
      >
        <Table className="min-w-[540px] sm:min-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[45%] text-xs font-medium">Nome do Quadro</TableHead>
              <TableHead className="text-xs font-medium">Criador</TableHead>
              <TableHead className="text-xs font-medium">Última Modificação</TableHead>
              <TableHead className="text-right text-xs font-medium">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((_, idx) => {
              const widthClass = TITLE_WIDTH_CLASSES[idx % TITLE_WIDTH_CLASSES.length];
              const staggerDelay = `${idx * 40}ms`;

              return (
                <TableRow 
                  key={idx} 
                  className="hover:bg-transparent"
                  style={{ animationDelay: staggerDelay }}
                >
                  {/* Nome do Quadro com Ícone */}
                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-6 rounded border border-border/40 shrink-0" />
                      <Skeleton className={`h-4 ${widthClass} max-w-[220px] rounded`} />
                    </div>
                  </TableCell>

                  {/* Criador & Badge */}
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3.5 w-16 rounded" />
                      <Skeleton className="h-4 w-9 rounded" />
                    </div>
                  </TableCell>

                  {/* Data */}
                  <TableCell className="text-xs text-muted-foreground">
                    <Skeleton className="h-3.5 w-24 rounded" />
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Skeleton className="size-7 rounded-md" />
                      <Skeleton className="h-7 w-16 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Visualização em Grade (Cards) adaptada exatamente à geometria dos cards reais
  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-200"
      aria-label="Carregando quadros em grade..."
    >
      {items.map((_, idx) => {
        const widthClass = TITLE_WIDTH_CLASSES[idx % TITLE_WIDTH_CLASSES.length];
        const staggerDelay = `${idx * 50}ms`;

        return (
          <Card
            key={idx}
            className="border-border bg-card flex flex-col justify-between overflow-hidden shadow-none pointer-events-none select-none"
            style={{ animationDelay: staggerDelay }}
          >
            {/* Header Visual Miniature com Canvas Dot Grid sutil e composição de quadro */}
            <div className="h-36 bg-muted/20 border-b border-border/60 flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.12] dark:opacity-[0.18]"
                style={{
                  backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                  backgroundSize: '14px 14px',
                }}
              />
              {/* Silhouette Blueprint de Post-its e Nós Conectados */}
              <div className="relative z-1 flex items-center gap-3 opacity-45">
                <Skeleton className="w-11 h-11 rounded-md border border-border/60 -rotate-3" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="w-13 h-6 rounded-md border border-border/60 rotate-1" />
                  <Skeleton className="w-12 h-6 rounded-md border border-border/60 -rotate-1" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2.5">
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>

            {/* Conteúdo do Card */}
            <CardContent className="p-3.5 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                {/* Linha do Título com largura variada */}
                <Skeleton className={`h-4 ${widthClass} rounded`} />
                {/* Linha da Data com ícone de relógio placeholder */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Skeleton className="size-3 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>

              {/* Barra Inferior com Criador e Botão de Ação */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-16 rounded" />
                  <Skeleton className="h-4 w-8 rounded" />
                </div>
                <Skeleton className="size-6 rounded" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
