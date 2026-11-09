import React, { useState, useEffect, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Globe, 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  ChevronDown,
  Sparkles,
  MessageSquare,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Board, BoardCollaborator, BoardPermission, CurrentUser } from '../../types/board';
import { isBoardOwner } from '../../utils/permissions';
import { boardService, cleanBoardId } from '../../services/boardService';

interface BoardPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board | null;
  currentUser: CurrentUser;
  onUpdateBoardSettings: (
    boardId: string,
    updates: Partial<Pick<Board, 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds'>>
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
    desc: 'Apenas convidados diretos têm acesso',
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BoardPermission>('edit');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setInviteEmail('');
      setInviteError(null);
      setInviteSuccess(null);
      setRemovedIds(new Set());
    }
  }, [open]);

  // Garante permissão válida com fallback seguro para 'edit' (mesmo quando board for nulo)
  const rawDefaultPermission = String(board?.defaultPermission || 'edit');
  const defaultPermission: BoardPermission = (rawDefaultPermission in PERMISSION_CONFIG) 
    ? (rawDefaultPermission as BoardPermission) 
    : 'edit';

  // Monta a lista completa de membros e colaboradores de forma 100% à prova de falhas
  // IMPORTANTE: Deve ser chamado antes de qualquer early return para respeitar as Regras de Hooks do React
  const memberList = useMemo<MemberEntry[]>(() => {
    if (!board) return [];
    const list: MemberEntry[] = [];
    const seenUids = new Set<string>();
    const seenEmails = new Set<string>();

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
    if (currentUser?.email && isOwner) {
      seenEmails.add(currentUser.email.toLowerCase());
    }

    // 2. Membros registrados
    if (board.members && typeof board.members === 'object') {
      const members = Object.values(board.members);
      for (const m of members) {
        if (!m || typeof m !== 'object' || !m.uid || seenUids.has(m.uid)) continue;
        if (effectiveRemovedSet.has(m.uid)) continue;
        if (m.role === 'none') continue;

        seenUids.add(m.uid);
        if (m.email) seenEmails.add(String(m.email).toLowerCase());

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

    // 3. Colaboradores convidados por e-mail
    if (board.collaborators && typeof board.collaborators === 'object') {
      const collabs = Object.values(board.collaborators);
      for (const c of collabs) {
        if (!c || typeof c !== 'object' || !c.email) continue;
        const cleanEmail = String(c.email).toLowerCase();
        if (seenEmails.has(cleanEmail)) continue;
        if (effectiveRemovedSet.has(cleanEmail) || effectiveRemovedSet.has(c.email)) continue;

        seenEmails.add(cleanEmail);
        const role = (c.role && c.role in PERMISSION_CONFIG) ? (c.role as BoardPermission) : 'edit';
        list.push({
          id: `email_${cleanEmail.replace(/[.#$[\]]/g, '_')}`,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          color: '#8b5cf6',
          isOwner: false,
          role,
        });
      }
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
      await onUpdateBoardSettings(board.id, { defaultPermission: perm });
    } catch (err) {
      console.error('Erro ao atualizar permissão geral:', err);
    }
  };

  const handleInviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    setInviteError(null);
    setInviteSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setInviteError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (currentUser?.email && email === currentUser.email.toLowerCase()) {
      setInviteError('Você já é o proprietário deste quadro.');
      return;
    }

    setIsInviting(true);
    try {
      const emailKey = email.replace(/[.#$[\]]/g, '_');
      const updatedCollaborators: Record<string, BoardCollaborator> = {
        ...(board.collaborators || {}),
        [emailKey]: {
          email,
          role: inviteRole,
          addedAt: Date.now(),
        },
      };

      const collaboratorEmails = Object.values(updatedCollaborators)
        .map((c) => (c?.email ? String(c.email).toLowerCase() : ''))
        .filter(Boolean);

      const safeRemovedIds = Array.isArray(board.removedMemberIds) ? board.removedMemberIds : [];
      const updatedRemoved = safeRemovedIds.filter((id) => id !== email);

      await onUpdateBoardSettings(board.id, {
        collaborators: updatedCollaborators,
        collaboratorEmails,
        removedMemberIds: updatedRemoved,
      });

      setInviteEmail('');
      setInviteSuccess(`Convite adicionado para ${email}`);
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao convidar colaborador:', err);
      setInviteError('Falha ao adicionar colaborador. Tente novamente.');
    } finally {
      setIsInviting(false);
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

      const updatedCollaborators = { ...(board.collaborators || {}) };
      if (member.email) {
        const cleanKey = member.email.replace(/[.#$[\]]/g, '_');
        delete updatedCollaborators[cleanKey];
      }

      const collaboratorEmails = Object.values(updatedCollaborators)
        .map((c) => (c?.email ? String(c.email).toLowerCase() : ''))
        .filter(Boolean);

      const safeRemovedIds = Array.isArray(board.removedMemberIds) ? board.removedMemberIds : [];
      const updatedRemoved = Array.from(
        new Set([...safeRemovedIds, ...(member.uid ? [member.uid] : [])])
      );

      await onUpdateBoardSettings(board.id, {
        members: updatedMembers,
        collaborators: updatedCollaborators,
        collaboratorEmails,
        removedMemberIds: updatedRemoved,
      });
      return;
    }

    // Atualização de papel
    const updates: Partial<Pick<Board, 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds'>> = {};

    if (member.uid) {
      const updatedMembers = { ...(board.members || {}) };
      const current = updatedMembers[member.uid];
      updatedMembers[member.uid] = {
        uid: member.uid,
        name: member.name,
        email: member.email || null,
        photoURL: member.photoURL || null,
        role: newRole,
        joinedAt: current?.joinedAt || Date.now(),
        lastSeen: Date.now(),
        isAnonymous: Boolean(member.isAnonymous),
        color: member.color || '#3b82f6',
      };
      updates.members = updatedMembers;
    }

    if (member.email) {
      const cleanKey = member.email.replace(/[.#$[\]]/g, '_');
      const updatedCollaborators = { ...(board.collaborators || {}) };
      updatedCollaborators[cleanKey] = {
        email: member.email,
        role: newRole,
        addedAt: Date.now(),
      };
      updates.collaborators = updatedCollaborators;
      updates.collaboratorEmails = Object.values(updatedCollaborators)
        .map((c) => (c?.email ? String(c.email).toLowerCase() : ''))
        .filter(Boolean);
    }

    await onUpdateBoardSettings(board.id, updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <ModalErrorBoundary onClose={() => onOpenChange(false)}>
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-4 ring-primary/5">
                <Users className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Permissões de Acesso
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gerencie quem pode visualizar, comentar ou editar o quadro{' '}
                  <strong className="text-foreground">{board.title || 'Quadro'}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Caixa de Compartilhamento do Link */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Link de Acesso
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center px-3 h-9 rounded-lg border border-border bg-muted/40 text-xs font-mono text-muted-foreground select-all truncate">
                  {shareUrl}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-9 px-3 gap-1.5 shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium text-xs">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span className="text-xs font-medium">Copiar link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Permissão Geral do Link */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <GeneralIcon className="size-4 text-foreground/80" />
                </div>
                <div className="space-y-0.5 min-w-0">
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

            <Separator className="bg-border/60" />

            {/* Formulário de Convidar por E-mail */}
            <form onSubmit={handleInviteCollaborator} className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Convidar por E-mail
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="nome@email.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError(null);
                  }}
                  className="h-9 text-xs flex-1"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2.5 text-xs gap-1 shrink-0 font-medium cursor-pointer"
                    >
                      <span>{(PERMISSION_CONFIG[inviteRole] || PERMISSION_CONFIG.edit).label}</span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {(['edit', 'comment', 'view'] as BoardPermission[]).map((permKey) => (
                      <DropdownMenuItem
                        key={permKey}
                        onClick={() => setInviteRole(permKey)}
                        className="text-xs cursor-pointer gap-2"
                      >
                        <span>{(PERMISSION_CONFIG[permKey] || PERMISSION_CONFIG.edit).label}</span>
                        {inviteRole === permKey && <Check className="size-3 text-primary ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!inviteEmail.trim() || isInviting}
                  className="h-9 px-3 gap-1.5 font-semibold text-xs shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <UserPlus className="size-3.5" />
                  <span>Convidar</span>
                </Button>
              </div>

              {inviteError && (
                <p className="text-xs text-destructive flex items-center gap-1 pt-0.5 animate-in fade-in duration-150">
                  <AlertCircle className="size-3" />
                  {inviteError}
                </p>
              )}

              {inviteSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5 animate-in fade-in duration-150">
                  <Check className="size-3" />
                  {inviteSuccess}
                </p>
              )}
            </form>

            {/* Lista de Membros e Pessoas com Acesso */}
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
                            {member.email || (member.isAnonymous ? 'Entrou pelo link de convidado' : 'Conta colaboradora')}
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
      </DialogContent>
    </Dialog>
  );
};
