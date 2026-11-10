import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Check, 
  X, 
  ChevronDown, 
  Sparkles, 
  Eye, 
  MessageSquare
} from '@/components/ui/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { Board, BoardPermission, JoinRequest } from '@/types/board';
import { boardService } from '@/services/boardService';
import { playKnockChimeSound } from '@/utils/audioChime';

interface HostJoinRequestBannerProps {
  board: Board;
  onOpenShareModal?: () => void;
}

const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const HostJoinRequestBanner: React.FC<HostJoinRequestBannerProps> = ({
  board,
  onOpenShareModal,
}) => {
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  // Lista de solicitações ativas com status 'pending'
  const pendingRequests = Object.values(board.joinRequests || {}).filter(
    (req): req is JoinRequest => Boolean(req && req.status === 'pending')
  );

  const prevCountRef = useRef(pendingRequests.length);

  // Toca o alerta sonoro suave de campainha quando uma nova solicitação chega
  useEffect(() => {
    if (pendingRequests.length > prevCountRef.current) {
      playKnockChimeSound();
    }
    prevCountRef.current = pendingRequests.length;
  }, [pendingRequests.length]);

  if (pendingRequests.length === 0) {
    return null;
  }

  // Pega a primeira solicitação da fila para destaque
  const activeRequest = pendingRequests[0];
  const totalPending = pendingRequests.length;
  const defaultRole = board.defaultPermission || 'edit';

  const handleApprove = async (role: BoardPermission = defaultRole) => {
    if (!activeRequest || processingUid) return;
    setProcessingUid(activeRequest.uid);
    try {
      await boardService.approveBoardAccess(board.id, activeRequest.uid, role, activeRequest);
    } catch (err) {
      console.error('Erro ao aprovar solicitação:', err);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleReject = async () => {
    if (!activeRequest || processingUid) return;
    setProcessingUid(activeRequest.uid);
    try {
      await boardService.rejectBoardAccess(board.id, activeRequest.uid);
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleApproveAll = async () => {
    if (processingUid) return;
    setProcessingUid('all');
    try {
      await boardService.approveAllBoardAccess(board.id, defaultRole);
    } catch (err) {
      console.error('Erro ao aprovar todos:', err);
    } finally {
      setProcessingUid(null);
    }
  };

  return (
    <div 
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-200 animate-in fade-in-50 slide-in-from-top-3"
      role="region"
      aria-label="Solicitações de entrada na sala"
    >
      <div className="flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-full py-1.5 pl-3 pr-2 text-xs text-foreground ring-1 ring-black/5 dark:ring-white/10 max-w-xl">
        
        {/* Avatar e Identidade do Convidado */}
        <div className="relative shrink-0 flex items-center">
          <Avatar className="size-7 border border-border shadow-sm">
            {activeRequest.photoURL && <AvatarImage src={activeRequest.photoURL} alt={activeRequest.name} />}
            <AvatarFallback 
              className="text-[10px] font-semibold text-white"
              style={{ backgroundColor: activeRequest.color || '#3b82f6' }}
            >
              {getInitials(activeRequest.name)}
            </AvatarFallback>
          </Avatar>
          
          {totalPending > 1 && (
            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-card shadow-sm">
              +{totalPending - 1}
            </span>
          )}
        </div>

        {/* Texto do Pedido */}
        <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
          <span className="font-semibold text-foreground max-w-[130px] truncate">
            {activeRequest.name}
          </span>
          <span className="text-muted-foreground hidden sm:inline">
            {totalPending > 1 
              ? `e mais ${totalPending - 1} ${totalPending - 1 === 1 ? 'pessoa' : 'pessoas'} querem entrar` 
              : 'quer entrar no quadro'}
          </span>
          <span className="text-muted-foreground sm:hidden">
            quer entrar
          </span>
        </div>

        {/* Botões de Ação Imediata */}
        <div className="flex items-center gap-1.5 ml-1">
          {/* Grupo de Aprovação: Botão Principal + Dropdown de Papel */}
          <div className="inline-flex items-center rounded-full bg-primary text-primary-foreground shadow-sm overflow-hidden divide-x divide-primary-foreground/20">
            <button
              type="button"
              disabled={Boolean(processingUid)}
              onClick={() => handleApprove(defaultRole)}
              className="px-2.5 py-1 text-xs font-medium hover:bg-primary/90 transition-transform duration-100 active:scale-[0.97] flex items-center gap-1"
              title="Aprovar com permissão padrão"
            >
              <Check className="size-3.5 stroke-[2.5]" />
              <span>Aprovar</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={Boolean(processingUid)}
                  className="px-1.5 py-1 hover:bg-primary/90 transition-colors"
                  title="Escolher nível de permissão"
                >
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1 text-xs shadow-xl border-border bg-card">
                <DropdownMenuLabel className="text-[10px] uppercase font-semibold text-muted-foreground px-2 py-1">
                  Aprovar como
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => handleApprove('edit')}
                  className="gap-2 cursor-pointer text-xs py-1.5"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium">Editor</span>
                    <span className="text-[10px] text-muted-foreground">Pode editar elementos</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleApprove('comment')}
                  className="gap-2 cursor-pointer text-xs py-1.5"
                >
                  <MessageSquare className="size-3.5 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Comentador</span>
                    <span className="text-[10px] text-muted-foreground">Pode adicionar notas</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleApprove('view')}
                  className="gap-2 cursor-pointer text-xs py-1.5"
                >
                  <Eye className="size-3.5 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Visualizador</span>
                    <span className="text-[10px] text-muted-foreground">Apenas visualização</span>
                  </div>
                </DropdownMenuItem>

                {totalPending > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleApproveAll}
                      className="gap-2 cursor-pointer text-xs py-1.5 text-primary font-medium"
                    >
                      <Users className="size-3.5" />
                      <span>Aprovar todos ({totalPending})</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Botão Recusar */}
          <button
            type="button"
            disabled={Boolean(processingUid)}
            onClick={handleReject}
            className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.97]"
            title="Recusar entrada"
          >
            <X className="size-3.5" />
          </button>

          {/* Botão para abrir o modal de Compartilhar com a lista completa */}
          {onOpenShareModal && totalPending > 1 && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
              title="Ver todas as solicitações"
            >
              <span>Ver todos</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
