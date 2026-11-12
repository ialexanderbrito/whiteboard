import React, { useState, useEffect, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Globe, 
  ShieldAlert, 
  Trash2, 
  ChevronDown, 
  Sparkles, 
  MessageSquare, 
  Eye, 
  AlertCircle 
} from '@/components/ui/icons';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ResponsiveModalRoot,
  ResponsiveModalContent,
} from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Board, BoardPermission, CurrentUser } from '../../types/board';
import { isBoardOwner } from '../../utils/permissions';
import { boardService, cleanBoardId } from '../../services/boardService';

interface BoardPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board | null;
  currentUser: CurrentUser;
  onUpdateBoardSettings: (
    boardId: string,
    updates: Partial<Pick<Board, 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'waitingRoomEnabled' | 'joinRequests'>>
  ) => Promise<void>;
}

// Error Boundary para garantir que qualquer erro na renderização de permissões nunca quebre a tela inteira
interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class ModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado no Modal de Permissões:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4">
          <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Não foi possível carregar as permissões</h3>
            <p className="text-xs text-muted-foreground">Ocorreu uma inconsistência nos dados deste quadro.</p>
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

const PERMISSION_CONFIG: Record<string, { label: string; desc: string; icon: React.ElementType }> = {
  edit: {
    label: 'Pode editar',
    desc: 'Pode criar, mover e editar qualquer elemento',
    icon: Sparkles,
  },
  comment: {
    label: 'Pode comentar',
    desc: 'Pode adicionar post-its e reagir com emojis',
    icon: MessageSquare,
  },
  view: {
    label: 'Apenas visualização',
    desc: 'Apenas visualiza o quadro em tempo real',
    icon: Eye,
  },
  none: {
    label: 'Restrito / Privado',
    desc: 'Apenas você e quem você autorizar tem acesso',
    icon: ShieldAlert,
  },
};

interface MemberEntry {
  id: string;
  uid?: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  color?: string;
  isOwner: boolean;
  role: BoardPermission;
  isAnonymous?: boolean;
}

const getInitials = (name?: unknown): string => {
  if (!name || typeof name !== 'string') return 'U';
  try {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'U';
  } catch {
    return 'U';
  }
};

export const BoardPermissionsModal: React.FC<BoardPermissionsModalProps> = ({
  open,
  onOpenChange,
  board,
  currentUser,
  onUpdateBoardSettings,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setRemovedIds(new Set());
    }
  }, [open]);

  // Garante permissão válida com fallback seguro para 'edit' (mesmo quando board for nulo)
  const rawDefaultPermission = String(board?.defaultPermission || 'edit');
  const defaultPermission: BoardPermission = (rawDefaultPermission in PERMISSION_CONFIG) 
    ? (rawDefaultPermission as BoardPermission) 
    : 'edit';

  // Monta a lista completa de membros de forma 100% à prova de falhas
  // IMPORTANTE: Deve ser chamado antes de qualquer early return para respeitar as Regras de Hooks do React
  const memberList = useMemo<MemberEntry[]>(() => {
    if (!board) return [];
    const list: MemberEntry[] = [];
    const seenUids = new Set<string>();

    const safeRemovedArray = Array.isArray(board.removedMemberIds) ? board.removedMemberIds : [];
    const effectiveRemovedSet = new Set([
      ...safeRemovedArray,
      ...Array.from(removedIds),
    ]);

    // 1. Dono do quadro
    const ownerUid = board.ownerId;
    const isOwner = isBoardOwner(board, currentUser);
    const ownerName = isOwner
      ? (currentUser?.displayName || board.ownerName || 'Proprietário')
      : (board.ownerName || 'Proprietário');

    list.push({
      id: ownerUid || 'owner_id',
      uid: ownerUid,
      name: ownerName,
      email: isOwner ? (currentUser?.email || null) : null,
      photoURL: isOwner ? (currentUser?.photoURL || null) : null,
      color: '#3b82f6',
      isOwner: true,
      role: 'edit',
    });

    if (ownerUid) seenUids.add(ownerUid);

    // 2. Membros registrados
    if (board.members && typeof board.members === 'object') {
      const members = Object.values(board.members);
      for (const m of members) {
        if (!m || typeof m !== 'object' || !m.uid || seenUids.has(m.uid)) continue;
        if (effectiveRemovedSet.has(m.uid)) continue;
        if (m.role === 'none') continue;

        seenUids.add(m.uid);
        const role = (m.role && m.role in PERMISSION_CONFIG) ? (m.role as BoardPermission) : defaultPermission;

        list.push({
          id: m.uid,
          uid: m.uid,
          name: m.name || (m.isAnonymous ? 'Convidado via link' : 'Usuário'),
          email: m.email || null,
          photoURL: m.photoURL || null,
          color: m.color || '#3b82f6',
          isOwner: false,
          role,
          isAnonymous: Boolean(m.isAnonymous),
        });
      }
    }

    // Guarda defensiva para estruturas legadas
    if (board.collaborators && typeof board.collaborators === 'object') {
      // Mantém compatibilidade defensiva sem expor convites por e-mail na UI
    }

    return list;
  }, [board, currentUser, defaultPermission, removedIds]);

  // Se não houver quadro selecionado, não renderiza o conteúdo do modal
  // (executado APÓS todos os hooks para não violar as Regras de Hooks)
  if (!board) return null;

  const CurrentGeneralConfig = PERMISSION_CONFIG[defaultPermission] || PERMISSION_CONFIG.edit;
  const GeneralIcon = CurrentGeneralConfig.icon || Globe;

  const cleanId = cleanBoardId(board.id || '');
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/b/${cleanId}` 
    : `/b/${cleanId}`;

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  const handleUpdateGeneralPermission = async (perm: BoardPermission) => {
    try {
      const updatedMembers = { ...(board?.members || {}) };
      let membersChanged = false;
      Object.entries(updatedMembers).forEach(([uid, m]) => {
        if (m && !m.hasCustomRole && m.role !== 'none') {
          updatedMembers[uid] = { ...m, role: perm };
          membersChanged = true;
        }
      });
      await onUpdateBoardSettings(board.id, {
        defaultPermission: perm,
        ...(membersChanged ? { members: updatedMembers } : {}),
      });
    } catch (err) {
      console.error('Erro ao atualizar permissão geral:', err);
    }
  };

  const handleUpdateMemberRole = async (member: MemberEntry, newRole: BoardPermission | 'remove') => {
    if (member.isOwner) return;

    if (newRole === 'remove') {
      const targetId = member.uid || member.id;
      setRemovedIds((prev) => new Set(prev).add(targetId));

      try {
        if (member.uid) {
          await boardService.removeBoardMember(board.id, member.uid);
        }
        if (member.email) {
          await boardService.removeBoardCollaborator(board.id, member.email);
        }
      } catch (e) {
        console.warn('Erro ao chamar boardService.remove:', e);
      }

      const updatedMembers = { ...(board.members || {}) };
      if (member.uid) {
        delete updatedMembers[member.uid];
      }

      const safeRemoved = Array.isArray(board.removedMemberIds) ? board.removedMemberIds : [];
      const updatedRemovedIds = Array.from(new Set([...safeRemoved, targetId]));

      const updatedJoinRequests = { ...(board.joinRequests || {}) };
      if (member.uid && updatedJoinRequests[member.uid]) {
        updatedJoinRequests[member.uid] = {
          ...updatedJoinRequests[member.uid],
          status: 'rejected',
          respondedAt: Date.now(),
        };
      }

      await onUpdateBoardSettings(board.id, {
        members: updatedMembers,
        joinRequests: updatedJoinRequests,
        removedMemberIds: updatedRemovedIds,
      });
      return;
    }

    // Atualiza papel individual do membro
    const updates: Partial<Pick<Board, 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'joinRequests'>> = {};

    if (member.uid) {
      const updatedMembers = { ...(board.members || {}) };
      const existing = updatedMembers[member.uid];
      updatedMembers[member.uid] = {
        ...(existing || { joinedAt: Date.now() }),
        uid: member.uid,
        name: member.name,
        role: newRole,
        hasCustomRole: true,
        lastSeen: Date.now(),
      };
      updates.members = updatedMembers;

      // Mantém joinRequests perfeitamente sincronizado com o novo papel
      const updatedJoinRequests = { ...(board.joinRequests || {}) };
      if (updatedJoinRequests[member.uid]) {
        updatedJoinRequests[member.uid] = {
          ...updatedJoinRequests[member.uid],
          status: 'approved',
          assignedRole: newRole,
          respondedAt: Date.now(),
        };
        updates.joinRequests = updatedJoinRequests;
      }
    }

    await onUpdateBoardSettings(board.id, updates);
  };

  return (
    <ResponsiveModalRoot open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <ModalErrorBoundary onClose={() => onOpenChange(false)}>
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-4 ring-primary/5">
                <Users className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Permissões de Acesso
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gerencie quem pode acessar e editar este quadro colaborativo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* 1. Link Curto de Acesso Direto com Copiar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Link de Compartilhamento Direto
              </label>
              <div className="flex items-center gap-2 p-1.5 pl-3 rounded-lg border border-border bg-muted/30 font-mono text-xs text-foreground">
                <span className="truncate flex-1 select-all">{shareUrl}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-7 px-2.5 text-xs gap-1.5 shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                >
                  {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </Button>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* 2. Permissão Geral do Link */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 text-muted-foreground shadow-2xs">
                  <GeneralIcon className="size-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-muted-foreground" />
                    Qualquer pessoa com o link
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {CurrentGeneralConfig.desc}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 font-medium shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                  >
                    <span>{CurrentGeneralConfig.label}</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {(['edit', 'comment', 'view', 'none'] as BoardPermission[]).map((permKey) => {
                    const cfg = PERMISSION_CONFIG[permKey] || PERMISSION_CONFIG.edit;
                    const Icon = cfg.icon;
                    const isSelected = defaultPermission === permKey;

                    return (
                      <DropdownMenuItem
                        key={permKey}
                        onClick={() => handleUpdateGeneralPermission(permKey)}
                        className="gap-2.5 p-2 text-xs cursor-pointer"
                      >
                        <Icon className={`size-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="space-y-0.5">
                          <p className={`font-medium leading-none ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {cfg.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {cfg.desc}
                          </p>
                        </div>
                        {isSelected && <Check className="size-3 text-primary ml-auto" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 3. Lista de Membros e Pessoas com Acesso */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Pessoas com Acesso ({memberList.length})
                </label>
              </div>

              <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden bg-background max-h-56 overflow-y-auto">
                {memberList.map((member) => {
                  const memberRoleConfig = PERMISSION_CONFIG[member.role] || PERMISSION_CONFIG.edit;

                  return (
                    <div
                      key={member.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 text-xs shrink-0">
                          {member.photoURL ? (
                            <AvatarImage src={member.photoURL} alt={member.name} />
                          ) : null}
                          <AvatarFallback
                            className="text-white font-medium"
                            style={{ backgroundColor: member.color || '#3b82f6' }}
                          >
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {member.name}
                            </span>
                            {member.isOwner && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal text-primary border-primary/30">
                                Proprietário
                              </Badge>
                            )}
                            {member.isAnonymous && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal text-muted-foreground">
                                Convidado
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.isOwner ? 'Proprietário' : (member.isAnonymous ? 'Acessou pelo link' : 'Membro')}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {member.isOwner ? (
                          <span className="text-xs text-muted-foreground font-medium px-2 py-1">
                            Acesso total
                          </span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <span>{memberRoleConfig.label}</span>
                                <ChevronDown className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {(['edit', 'comment', 'view'] as BoardPermission[]).map((permKey) => (
                                <DropdownMenuItem
                                  key={permKey}
                                  onClick={() => handleUpdateMemberRole(member, permKey)}
                                  className="text-xs cursor-pointer gap-2"
                                >
                                  <span>{(PERMISSION_CONFIG[permKey] || PERMISSION_CONFIG.edit).label}</span>
                                  {member.role === permKey && <Check className="size-3 text-primary ml-auto" />}
                                </DropdownMenuItem>
                              ))}
                              <Separator className="my-1" />
                              <DropdownMenuItem
                                onClick={() => handleUpdateMemberRole(member, 'remove')}
                                className="text-xs cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="size-3" />
                                <span>Remover acesso</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalErrorBoundary>
      </ResponsiveModalContent>
    </ResponsiveModalRoot>
  );
};
