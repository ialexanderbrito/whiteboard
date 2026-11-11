import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  Globe, 
  Lock, 
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  Users,
  X
} from '@/components/ui/icons';
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
import type { Board, BoardPermission, CurrentUser, UserPresence, JoinRequest } from '../../types/board';
import { isBoardOwner } from '../../utils/permissions';
import { boardService } from '../../services/boardService';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board | null;
  currentUser: CurrentUser;
  remoteUsers?: UserPresence[];
  onUpdateBoardSettings?: (updates: Partial<Pick<Board, 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'waitingRoomEnabled' | 'joinRequests' | 'isPasswordProtected' | 'password'>>) => Promise<void>;
}

const PERMISSION_LABELS: Record<BoardPermission, { label: string; desc: string }> = {
  edit: { label: 'Pode editar', desc: 'Pode criar, mover e editar qualquer elemento' },
  comment: { label: 'Pode comentar', desc: 'Pode adicionar notas e reagir com emojis' },
  view: { label: 'Pode visualizar', desc: 'Apenas visualiza o quadro em tempo real' },
  none: { label: 'Sem acesso', desc: 'Acesso restrito apenas ao proprietário e membros autorizados' },
};

interface AccessPerson {
  id: string;
  uid?: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  color?: string;
  isOwner: boolean;
  isCurrentUser: boolean;
  isAnonymous: boolean;
  isOnline: boolean;
  role: BoardPermission;
  subtitle: string;
  badgeLabel?: string;
}

const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onOpenChange,
  board,
  currentUser,
  remoteUsers = [],
  onUpdateBoardSettings,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Estados de proteção por senha
  const [hasPassword, setHasPassword] = useState(Boolean(board?.isPasswordProtected));
  const [boardPassword, setBoardPassword] = useState(board?.password || '');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (board) {
      setHasPassword(Boolean(board.isPasswordProtected));
      setBoardPassword('');
    }
  }, [board]);

  useEffect(() => {
    if (open) {
      setRemovedIds(new Set());
    }
  }, [open]);

  const defaultPermission: BoardPermission = board?.defaultPermission || 'edit';
  const isOwner = isBoardOwner(board, currentUser);

  const pendingRequests = useMemo(() => {
    if (!board?.joinRequests) return [];
    return Object.values(board.joinRequests).filter(
      (req): req is JoinRequest => Boolean(req && req.status === 'pending')
    );
  }, [board?.joinRequests]);

  const handleApproveRequest = async (uid: string, role: BoardPermission, req?: JoinRequest) => {
    if (!board) return;
    await boardService.approveBoardAccess(board.id, uid, role, req);
  };

  const handleRejectRequest = async (uid: string) => {
    if (!board) return;
    await boardService.rejectBoardAccess(board.id, uid);
  };

  const handleApproveAllRequests = async () => {
    if (!board) return;
    await boardService.approveAllBoardAccess(board.id, defaultPermission);
  };

  // Link curto e limpo no padrão /b/:id (sem prefixo redundante board_)
  const cleanId = (board?.id || '').replace(/^board_/, '');
  const cleanShareUrl = cleanId ? `${window.location.origin}/b/${cleanId}` : window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cleanShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  const handleSavePassword = async () => {
    if (!onUpdateBoardSettings) return;
    if (hasPassword && !boardPassword.trim()) return;

    await onUpdateBoardSettings({
      isPasswordProtected: hasPassword,
      password: hasPassword ? boardPassword.trim() : '',
    });

    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const handleTogglePassword = async (enabled: boolean) => {
    setHasPassword(enabled);
    if (!enabled && onUpdateBoardSettings) {
      await onUpdateBoardSettings({
        isPasswordProtected: false,
        password: '',
      });
      setBoardPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    }
  };

  const handleUpdateGeneralPermission = async (perm: BoardPermission) => {
    if (onUpdateBoardSettings) {
      const updatedMembers = { ...(board?.members || {}) };
      let membersChanged = false;
      Object.entries(updatedMembers).forEach(([uid, m]) => {
        if (m && !m.hasCustomRole && m.role !== 'none') {
          updatedMembers[uid] = { ...m, role: perm };
          membersChanged = true;
        }
      });
      await onUpdateBoardSettings({
        defaultPermission: perm,
        ...(membersChanged ? { members: updatedMembers } : {}),
      });
    }
  };

  const handleUpdatePersonRole = async (person: AccessPerson, newRole: BoardPermission | 'remove') => {
    if (!board || !onUpdateBoardSettings || person.isOwner) return;

    if (newRole === 'remove' || newRole === 'none') {
      // 1. Marca imediatamente no estado local para remoção instantânea na UI do modal
      const idKey = person.id;
      const uidKey = person.uid || '';
      const emailKey = person.email ? person.email.replace(/[.#$[\]]/g, '_') : '';
      setRemovedIds((prev) => {
        const next = new Set(prev);
        if (idKey) next.add(idKey);
        if (uidKey) next.add(uidKey);
        if (emailKey) {
          next.add(emailKey);
          next.add(`email_${emailKey}`);
        }
        if (person.email) next.add(person.email);
        return next;
      });

      // 2. Remove presença e atualiza Firestore
      if (person.uid) {
        await boardService.removeBoardMember(board.id, person.uid);
      }

      // 3. Remove colaborador de e-mail se houver
      if (person.email) {
        await boardService.removeBoardCollaborator(board.id, person.email);
      }

      // 4. Remove definitivamente da lista de membros
      const updatedMembers = { ...(board.members || {}) };
      if (person.uid) {
        delete updatedMembers[person.uid];
      }
      const updatedRemoved = Array.from(
        new Set([...(board.removedMemberIds || []), ...(person.uid ? [person.uid] : [])])
      );

      const updatedCollaborators = { ...(board.collaborators || {}) };
      if (person.email) {
        const cleanKey = person.email.replace(/[.#$[\]]/g, '_');
        delete updatedCollaborators[cleanKey];
      }
      const collaboratorEmails = Object.values(updatedCollaborators)
        .map((c) => (c?.email ? c.email.toLowerCase() : ''))
        .filter(Boolean);

      const updatedJoinRequests = { ...(board.joinRequests || {}) };
      if (person.uid && updatedJoinRequests[person.uid]) {
        updatedJoinRequests[person.uid] = {
          ...updatedJoinRequests[person.uid],
          status: 'rejected',
          respondedAt: Date.now(),
        };
      }

      await onUpdateBoardSettings({
        members: updatedMembers,
        joinRequests: updatedJoinRequests,
        removedMemberIds: updatedRemoved,
        collaborators: updatedCollaborators,
        collaboratorEmails,
      });
      return;
    }

    // Se estiver re-atribuindo papel válido ('edit' | 'comment' | 'view'):
    const updatedRemoved = (board.removedMemberIds || []).filter(
      (id) => id !== person.uid && (!person.email || id !== person.email)
    );

    // Limpa do estado local de remoção do modal
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (person.id) next.delete(person.id);
      if (person.uid) next.delete(person.uid);
      if (person.email) {
        next.delete(person.email);
        next.delete(`email_${person.email.replace(/[.#$[\]]/g, '_')}`);
      }
      return next;
    });

    const updates: Partial<Pick<Board, 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'joinRequests'>> = {
      removedMemberIds: updatedRemoved,
    };

    if (person.uid) {
      await boardService.unremoveBoardMember(board.id, person.uid, newRole);
      const updatedMembers = { ...(board.members || {}) };
      const existing = updatedMembers[person.uid];
      updatedMembers[person.uid] = {
        uid: person.uid,
        name: person.name,
        email: person.email || null,
        photoURL: person.photoURL || null,
        role: newRole,
        hasCustomRole: true,
        joinedAt: existing?.joinedAt || Date.now(),
        lastSeen: Date.now(),
        isAnonymous: person.isAnonymous,
        color: person.color || '#3b82f6',
      };
      updates.members = updatedMembers;

      // Mantém joinRequests perfeitamente sincronizado com o novo papel
      const updatedJoinRequests = { ...(board.joinRequests || {}) };
      if (updatedJoinRequests[person.uid]) {
        updatedJoinRequests[person.uid] = {
          ...updatedJoinRequests[person.uid],
          status: 'approved',
          assignedRole: newRole,
          respondedAt: Date.now(),
        };
        updates.joinRequests = updatedJoinRequests;
      }
    }

    if (person.email) {
      const emailKey = person.email.replace(/[.#$[\]]/g, '_');
      const updatedCollaborators = { ...(board.collaborators || {}) };
      updatedCollaborators[emailKey] = {
        email: person.email,
        role: newRole,
        addedAt: Date.now(),
      };
      updates.collaborators = updatedCollaborators;
      updates.collaboratorEmails = Object.values(updatedCollaborators)
        .map((c) => c?.email?.toLowerCase() || '')
        .filter(Boolean);
    }

    await onUpdateBoardSettings(updates);
  };

  // Unifica e calcula todas as pessoas com acesso ao quadro (Dono, Membros registrados, Visitantes online e Convites)
  const peopleWithAccess = useMemo<AccessPerson[]>(() => {
    const map = new Map<string, AccessPerson>();
    const effectiveRemovedSet = new Set([
      ...(board?.removedMemberIds || []),
      ...Array.from(removedIds),
    ]);

    // 1. Dono do quadro (sempre baseado no ownerId legítimo do quadro)
    const ownerUid = board?.ownerId;
    const isOwnerCurrentUser = Boolean(ownerUid && currentUser?.uid && ownerUid === currentUser.uid);
    const ownerName = isOwnerCurrentUser
      ? (currentUser?.displayName || board?.ownerName || 'Proprietário')
      : (board?.ownerName || 'Proprietário');
    const isOwnerOnline = isOwnerCurrentUser ? true : Boolean(remoteUsers?.some((u) => u.userId === ownerUid));
    const isOwnerAnonymous = isOwnerCurrentUser ? Boolean(currentUser.isAnonymous) : false;

    const ownerPerson: AccessPerson = {
      id: ownerUid || (isOwnerCurrentUser ? currentUser.uid : 'owner'),
      uid: ownerUid || (isOwnerCurrentUser ? currentUser.uid : undefined),
      name: ownerName,
      email: isOwnerCurrentUser ? currentUser.email : null,
      photoURL: isOwnerCurrentUser ? currentUser.photoURL : null,
      color: isOwnerCurrentUser ? (currentUser.color || '#3b82f6') : '#3b82f6',
      isOwner: true,
      isCurrentUser: isOwnerCurrentUser,
      isAnonymous: isOwnerAnonymous,
      isOnline: isOwnerOnline,
      role: 'edit',
      subtitle: isOwnerCurrentUser
        ? (currentUser.email ? `Online agora • ${currentUser.email}` : (currentUser.isAnonymous ? 'Online agora • Criador (Convidado)' : 'Online agora • Proprietário'))
        : (isOwnerOnline ? 'Online agora • Proprietário' : 'Proprietário do quadro'),
      badgeLabel: 'Proprietário',
    };

    // 2. Membros registrados no board (visitantes, anônimos e usuários que já acessaram)
    const members = Object.values(board?.members || {});
    for (const m of members) {
      if (!m || !m.uid) continue;
      if (ownerUid && m.uid === ownerUid) continue;
      if (isOwner && m.uid === currentUser.uid) continue;
      if (isOwner && currentUser.email && m.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) continue;
      
      const isRemoved = effectiveRemovedSet.has(m.uid) || m.role === 'none';
      // Usuários com acesso revogado NÃO aparecem na lista de pessoas com acesso
      if (isRemoved) continue;

      const isThisUser = m.uid === currentUser.uid;
      const remoteMatch = remoteUsers?.find((u) => u.userId === m.uid);
      const isOnline = isThisUser || Boolean(remoteMatch);
      const isGuest = Boolean(m.isAnonymous || !m.email);
      const displayName = remoteMatch?.name || m.name || (m as { displayName?: string }).displayName || (isGuest ? 'Convidado' : 'Usuário');
      const color = remoteMatch?.color || m.color || '#3b82f6';

      const subtitleParts: string[] = [];
      if (isOnline) subtitleParts.push('Online agora');
      if (isGuest) subtitleParts.push('Convidado via link');
      else if (m.email) subtitleParts.push(m.email);
      else subtitleParts.push('Colaborador');

      map.set(m.uid, {
        id: m.uid,
        uid: m.uid,
        name: displayName,
        email: m.email || null,
        photoURL: m.photoURL || null,
        color,
        isOwner: false,
        isCurrentUser: isThisUser,
        isAnonymous: isGuest,
        isOnline,
        role: m.role || defaultPermission,
        subtitle: subtitleParts.join(' • '),
        badgeLabel: isGuest ? 'Convidado' : undefined,
      });
    }

    // 3. Usuários conectados na sala agora (remoteUsers) que ainda não foram sincronizados
    if (remoteUsers && remoteUsers.length > 0) {
      for (const r of remoteUsers) {
        if (effectiveRemovedSet.has(r.userId)) continue;
        if (ownerUid && r.userId === ownerUid) continue;
        if (isOwner && r.userId === currentUser.uid) continue;
        if (board?.removedMemberIds?.includes(r.userId) || board?.members?.[r.userId]?.role === 'none') continue;
        if (map.has(r.userId)) {
          const existing = map.get(r.userId)!;
          existing.isOnline = true;
          if (r.name && (!existing.name || existing.name === 'Convidado')) {
            existing.name = r.name;
          }
          if (r.color) existing.color = r.color;
          continue;
        }

        const isThisUser = r.userId === currentUser.uid;
        map.set(r.userId, {
          id: r.userId,
          uid: r.userId,
          name: r.name || 'Convidado',
          email: null,
          photoURL: null,
          color: r.color || '#10b981',
          isOwner: false,
          isCurrentUser: isThisUser,
          isAnonymous: true,
          isOnline: true,
          role: defaultPermission,
          subtitle: 'Online agora • Convidado via link',
          badgeLabel: 'Convidado',
        });
      }
    }

    // 4. Usuário atual (se não for dono e ainda não estiver na lista)
    if (!isOwner && currentUser?.uid && !map.has(currentUser.uid)) {
      if (!effectiveRemovedSet.has(currentUser.uid)) {
        const isGuest = Boolean(currentUser.isAnonymous || !currentUser.email);
        map.set(currentUser.uid, {
          id: currentUser.uid,
          uid: currentUser.uid,
          name: currentUser.displayName || (isGuest ? 'Convidado' : 'Usuário'),
          email: currentUser.email || null,
          photoURL: currentUser.photoURL || null,
          color: currentUser.color || '#3b82f6',
          isOwner: false,
          isCurrentUser: true,
          isAnonymous: isGuest,
          isOnline: true,
          role: defaultPermission,
          subtitle: isGuest ? 'Online agora • Convidado via link' : `Online agora • ${currentUser.email}`,
          badgeLabel: isGuest ? 'Convidado' : undefined,
        });
      }
    }

    // 5. Convites enviados por e-mail (collaborators)
    const collaborators = Object.values(board?.collaborators || {});
    for (const c of collaborators) {
      if (!c || !c.email || c.role === 'none') continue;
      const emailLower = c.email.toLowerCase();
      const emailKey = c.email.replace(/[.#$[\]]/g, '_');
      if (
        effectiveRemovedSet.has(`email_${emailKey}`) ||
        effectiveRemovedSet.has(c.email) ||
        effectiveRemovedSet.has(emailKey)
      ) {
        continue;
      }
      if (isOwner && currentUser.email && currentUser.email.toLowerCase() === emailLower) continue;
      const alreadyExists = Array.from(map.values()).some(
        (p) => p.email && p.email.toLowerCase() === emailLower
      );
      if (!alreadyExists) {
        const isThisUser = Boolean(currentUser.email && currentUser.email.toLowerCase() === emailLower);
        map.set(`email_${emailKey}`, {
          id: emailKey,
          email: c.email,
          name: c.email,
          photoURL: null,
          color: '#64748b',
          isOwner: false,
          isCurrentUser: isThisUser,
          isAnonymous: false,
          isOnline: false,
          role: c.role,
          subtitle: 'Convidado por e-mail (pendente)',
        });
      }
    }

    // Ordenação inteligente: Dono primeiro, Usuário atual a seguir, Ativos primeiro, depois alfabético
    const otherPeople = Array.from(map.values()).sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });

    return [ownerPerson, ...otherPeople];
  }, [board, currentUser, remoteUsers, isOwner, defaultPermission, removedIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[490px] p-5 gap-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Share2 className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">Compartilhar &quot;{board?.title || 'Quadro'}&quot;</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina o nível de acesso pelo link compartilhado e gerencie quem está participando.
          </DialogDescription>
        </DialogHeader>

        {/* Permissão Geral do Link */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Acesso Geral com o Link
          </label>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {defaultPermission === 'none' ? <Lock className="size-3.5" /> : <Globe className="size-3.5" />}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  {defaultPermission === 'none' ? 'Acesso Restrito' : 'Qualquer pessoa com o link'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {PERMISSION_LABELS[defaultPermission].desc}
                </p>
              </div>
            </div>

            {/* Menu de Permissão Geral */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 font-medium">
                  <span>{PERMISSION_LABELS[defaultPermission].label}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                {(['edit', 'comment', 'view', 'none'] as BoardPermission[]).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => handleUpdateGeneralPermission(p)}
                    className="flex flex-col items-start py-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{PERMISSION_LABELS[p].label}</span>
                      {defaultPermission === p && <Check className="size-3 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{PERMISSION_LABELS[p].desc}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Link Curto e Limpo */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Link Curto de Acesso Direto
          </label>
          <div className="flex items-center gap-2 p-1.5 pl-2.5 rounded-lg border border-border bg-muted/30 font-mono text-xs text-foreground">
            <span className="truncate flex-1 select-all">{cleanShareUrl}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="h-7 px-2 text-xs gap-1 shrink-0 cursor-pointer"
            >
              {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
            </Button>
          </div>
        </div>

        {/* 3. Proteção por Senha (Dono do Quadro) */}
        {isOwner && (
          <div className="space-y-2 p-2.5 rounded-lg border border-border bg-muted/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex size-6 items-center justify-center rounded-md ${hasPassword ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                  {hasPassword ? <KeyRound className="size-3.5" /> : <Unlock className="size-3.5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Proteção por Senha</p>
                  <p className="text-[10px] text-muted-foreground">Exige senha dos participantes para abrir o quadro</p>
                </div>
              </div>
              <Button
                type="button"
                variant={hasPassword ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTogglePassword(!hasPassword)}
                className={`h-6 text-[11px] px-2 transition ${hasPassword ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
              >
                {hasPassword ? 'Ativada' : 'Desativada'}
              </Button>
            </div>

            {hasPassword && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in-50 duration-150">
                <div className="relative flex-1">
                  <Input
                    type={showPasswordText ? 'text' : 'password'}
                    placeholder={board?.password ? "Alterar senha de acesso..." : "Defina a senha de acesso..."}
                    value={boardPassword}
                    onChange={(e) => setBoardPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSavePassword();
                      }
                    }}
                    className="h-8 text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    tabIndex={-1}
                  >
                    {showPasswordText ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePassword}
                  disabled={!boardPassword.trim()}
                  className="h-8 text-xs px-2.5 gap-1 shrink-0 bg-primary text-primary-foreground"
                >
                  {passwordSaved ? <Check className="size-3.5 text-emerald-400" /> : <KeyRound className="size-3.5" />}
                  <span>{passwordSaved ? 'Salva!' : 'Salvar'}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Solicitações Pendentes de Entrada */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="space-y-2.5 p-3 rounded-xl border border-primary/30 bg-primary/5 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  {pendingRequests.length}
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  Aguardando sua autorização
                </span>
              </div>
              {pendingRequests.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleApproveAllRequests}
                  className="h-6 text-[11px] px-2 text-primary hover:text-primary hover:bg-primary/10"
                >
                  Aprovar todos ({pendingRequests.length})
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 divide-y divide-border/30">
              {pendingRequests.map((req) => (
                <div key={req.uid} className="flex items-center justify-between pt-2 first:pt-0">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Avatar className="size-7 text-[10px] border border-border shadow-sm">
                      {req.photoURL && <AvatarImage src={req.photoURL} alt={req.name} />}
                      <AvatarFallback 
                        style={{ backgroundColor: req.color || '#3b82f6' }} 
                        className="text-white font-semibold text-[10px]"
                      >
                        {getInitials(req.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-medium text-foreground truncate">{req.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {req.email || (req.isAnonymous ? 'Convidado via link' : 'Usuário')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="inline-flex items-center rounded-md bg-primary text-primary-foreground shadow-sm overflow-hidden divide-x divide-primary-foreground/20">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req.uid, defaultPermission, req)}
                        className="h-6 px-2 text-[11px] font-medium hover:bg-primary/90 flex items-center gap-1 active:scale-[0.97]"
                        title="Aprovar com papel padrão"
                      >
                        <Check className="size-3" />
                        <span>Aprovar</span>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-6 px-1 hover:bg-primary/90 flex items-center justify-center"
                            title="Escolher nível de permissão"
                          >
                            <ChevronDown className="size-2.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuItem onClick={() => handleApproveRequest(req.uid, 'edit', req)}>
                            Como Editor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleApproveRequest(req.uid, 'comment', req)}>
                            Como Comentador
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleApproveRequest(req.uid, 'view', req)}>
                            Como Visualizador
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRejectRequest(req.uid)}
                      className="size-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.97]"
                      title="Recusar entrada"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Pessoas com Acesso (Proprietário, Membros, Visitantes e Convidados) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5" />
              <span>Pessoas com Acesso ({peopleWithAccess.length})</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-medium">
              {peopleWithAccess.filter((p) => p.isOnline).length} online agora
            </span>
          </div>

          <div className="max-h-[175px] overflow-y-auto space-y-1 pr-1 divide-y divide-border/20">
            {peopleWithAccess.map((person) => {
              const isSelf = person.isCurrentUser;
              const initials = getInitials(person.name);

              return (
                <div
                  key={person.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {/* Avatar com status de conexão */}
                    <div className="relative shrink-0">
                      <Avatar className="size-7 text-[11px] border border-border/40">
                        {person.photoURL && <AvatarImage src={person.photoURL} alt={person.name} />}
                        <AvatarFallback
                          style={{
                            backgroundColor: person.color ? `${person.color}25` : undefined,
                            color: person.color || undefined,
                          }}
                          className="font-bold font-mono"
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {person.isOnline && (
                        <span
                          title="Online agora"
                          className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
                        />
                      )}
                    </div>

                    {/* Nome e subtítulo */}
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate max-w-[150px] sm:max-w-[180px]">
                          {person.name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            (Você)
                          </span>
                        )}
                        {!person.isOwner && person.isAnonymous && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-muted text-muted-foreground shrink-0">
                            Convidado
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[180px] sm:max-w-[210px]">
                        {person.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Controle de permissão / Exibição de papel */}
                  <div className="shrink-0 flex items-center">
                    {person.isOwner ? (
                      <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                        Proprietário
                      </Badge>
                    ) : isOwner ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-1.5 font-medium hover:bg-muted">
                            <span>{PERMISSION_LABELS[person.role]?.label || 'Pode editar'}</span>
                            <ChevronDown className="size-3 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs w-44">
                          {(['edit', 'comment', 'view'] as BoardPermission[]).map((p) => (
                            <DropdownMenuItem
                              key={p}
                              onClick={() => handleUpdatePersonRole(person, p)}
                              className="cursor-pointer justify-between"
                            >
                              <span>{PERMISSION_LABELS[p].label}</span>
                              {person.role === p && <Check className="size-3 text-primary" />}
                            </DropdownMenuItem>
                          ))}
                          <Separator className="my-1" />
                          <DropdownMenuItem
                            onClick={() => handleUpdatePersonRole(person, 'remove')}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                          >
                            Revogar acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium px-1">
                        {PERMISSION_LABELS[person.role]?.label || 'Pode editar'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Rodapé com Botão Único e Direto de Copiar Link */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Fechar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs font-semibold gap-1.5 h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer active:scale-[0.97] transition-all"
          >
            {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
