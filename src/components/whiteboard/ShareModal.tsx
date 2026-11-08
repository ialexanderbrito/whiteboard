import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  Mail, 
  Globe, 
  Lock, 
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  UserPlus,
  Users
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
import type { Board, BoardPermission, CurrentUser, UserPresence } from '../../types/board';
import { isBoardOwner } from '../../utils/permissions';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board | null;
  currentUser: CurrentUser;
  remoteUsers?: UserPresence[];
  onUpdateBoardSettings?: (updates: Partial<Pick<Board, 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'isPasswordProtected' | 'password'>>) => Promise<void>;
}

const PERMISSION_LABELS: Record<BoardPermission, { label: string; desc: string }> = {
  edit: { label: 'Pode editar', desc: 'Pode criar, mover e editar qualquer elemento' },
  comment: { label: 'Pode comentar', desc: 'Pode adicionar notas e reagir com emojis' },
  view: { label: 'Pode visualizar', desc: 'Apenas visualiza o quadro em tempo real' },
  none: { label: 'Sem acesso', desc: 'Acesso restrito apenas a convidados diretos' },
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
  const [inviteInput, setInviteInput] = useState('');
  const [inviteRole, setInviteRole] = useState<BoardPermission>('edit');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Estados de proteção por senha
  const [hasPassword, setHasPassword] = useState(Boolean(board?.isPasswordProtected));
  const [boardPassword, setBoardPassword] = useState(board?.password || '');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (board) {
      setHasPassword(Boolean(board.isPasswordProtected));
      setBoardPassword(board.password || '');
    }
  }, [board]);

  const defaultPermission: BoardPermission = board?.defaultPermission || 'edit';
  const isOwner = isBoardOwner(board, currentUser);

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

  const handleInvite = async () => {
    if (!inviteInput.trim()) return;
    const input = inviteInput.trim();
    const isEmail = input.includes('@');

    if (isEmail) {
      const email = input.toLowerCase();
      const roleLabel = PERMISSION_LABELS[inviteRole].label;
      const boardTitle = board?.title || 'Quadro sem título';

      const subject = `Convite para colaborar no quadro: ${boardTitle}`;
      const body = `Olá!\n\nVocê foi convidado para colaborar no quadro "${boardTitle}" no Mirio.\n\nNível de permissão concedido: ${roleLabel}\n\nAcesse o quadro pelo link abaixo:\n${cleanShareUrl}\n\nBom trabalho!\n${currentUser.displayName}`;

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        email
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.open(gmailUrl, '_blank', 'noopener,noreferrer');

      // Salva o colaborador na lista do quadro
      const newCollaborators = {
        ...(board?.collaborators || {}),
        [email.replace(/[.#$[\]]/g, '_')]: {
          email,
          role: inviteRole,
          addedAt: Date.now(),
        },
      };

      const collaboratorEmails = Object.values(newCollaborators).map((c) => c.email.toLowerCase());

      if (onUpdateBoardSettings) {
        await onUpdateBoardSettings({ 
          collaborators: newCollaborators,
          collaboratorEmails
        });
      }

      setInviteInput('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } else {
      // Adiciona como convidado na lista de membros do quadro
      if (!onUpdateBoardSettings) return;
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
      const newMembers = {
        ...(board?.members || {}),
        [guestId]: {
          uid: guestId,
          name: input,
          role: inviteRole,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
          isAnonymous: true,
          color: '#3b82f6',
        },
      };

      await onUpdateBoardSettings({ members: newMembers });
      setInviteInput('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    }
  };

  const handleUpdateGeneralPermission = async (perm: BoardPermission) => {
    if (onUpdateBoardSettings) {
      await onUpdateBoardSettings({ defaultPermission: perm });
    }
  };

  const handleUpdatePersonRole = async (person: AccessPerson, newRole: BoardPermission | 'remove') => {
    if (!board || !onUpdateBoardSettings || person.isOwner) return;

    const updates: Partial<Pick<Board, 'collaborators' | 'collaboratorEmails' | 'members'>> = {};

    // 1. Atualiza membros (members) se a pessoa possuir UID
    if (person.uid) {
      const updatedMembers = { ...(board.members || {}) };
      if (newRole === 'remove') {
        delete updatedMembers[person.uid];
      } else {
        const existing = updatedMembers[person.uid];
        updatedMembers[person.uid] = {
          uid: person.uid,
          name: person.name,
          email: person.email || null,
          photoURL: person.photoURL || null,
          role: newRole,
          joinedAt: existing?.joinedAt || Date.now(),
          lastSeen: Date.now(),
          isAnonymous: person.isAnonymous,
          color: person.color || '#3b82f6',
        };
      }
      updates.members = updatedMembers;
    }

    // 2. Atualiza colaboradores (collaborators) se a pessoa possuir e-mail
    if (person.email) {
      const emailKey = person.email.replace(/[.#$[\]]/g, '_');
      const updatedCollaborators = { ...(board.collaborators || {}) };
      if (newRole === 'remove') {
        delete updatedCollaborators[emailKey];
      } else if (updatedCollaborators[emailKey]) {
        updatedCollaborators[emailKey] = { ...updatedCollaborators[emailKey], role: newRole };
      }
      updates.collaborators = updatedCollaborators;
      updates.collaboratorEmails = Object.values(updatedCollaborators).map((c) =>
        c.email.toLowerCase()
      );
    }

    await onUpdateBoardSettings(updates);
  };

  // Unifica e calcula todas as pessoas com acesso ao quadro (Dono, Membros registrados, Visitantes online e Convites)
  const peopleWithAccess = useMemo<AccessPerson[]>(() => {
    const map = new Map<string, AccessPerson>();

    // 1. Dono do quadro
    const ownerUid = board?.ownerId || (isOwner ? currentUser?.uid : undefined);
    const ownerName = isOwner
      ? (currentUser?.displayName || board?.ownerName || 'Proprietário')
      : (board?.ownerName || 'Proprietário');
    const isOwnerOnline = isOwner ? true : Boolean(remoteUsers?.some((u) => u.userId === ownerUid));

    const ownerPerson: AccessPerson = {
      id: ownerUid || (isOwner ? currentUser.uid : 'owner'),
      uid: ownerUid || (isOwner ? currentUser.uid : undefined),
      name: ownerName,
      email: isOwner ? currentUser.email : null,
      photoURL: isOwner ? currentUser.photoURL : null,
      color: isOwner ? (currentUser.color || '#3b82f6') : '#3b82f6',
      isOwner: true,
      isCurrentUser: isOwner,
      isAnonymous: false,
      isOnline: isOwnerOnline,
      role: 'edit',
      subtitle: isOwner
        ? (currentUser.email ? `Online agora • ${currentUser.email}` : 'Online agora • Proprietário')
        : (isOwnerOnline ? 'Online agora • Proprietário' : 'Proprietário do quadro'),
      badgeLabel: 'Proprietário',
    };

    // 2. Membros registrados no board (visitantes, anônimos e usuários que já acessaram)
    const members = Object.values(board?.members || {});
    for (const m of members) {
      if (ownerUid && m.uid === ownerUid) continue;
      if (isOwner && m.uid === currentUser.uid) continue;
      if (isOwner && currentUser.email && m.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) continue;
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
        if (ownerUid && r.userId === ownerUid) continue;
        if (isOwner && r.userId === currentUser.uid) continue;
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

    // 5. Convites enviados por e-mail (collaborators)
    const collaborators = Object.values(board?.collaborators || {});
    for (const c of collaborators) {
      const emailLower = c.email.toLowerCase();
      if (isOwner && currentUser.email && currentUser.email.toLowerCase() === emailLower) continue;
      const alreadyExists = Array.from(map.values()).some(
        (p) => p.email && p.email.toLowerCase() === emailLower
      );
      if (!alreadyExists) {
        const emailKey = c.email.replace(/[.#$[\]]/g, '_');
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

    // Ordenação inteligente: Dono primeiro, Usuário atual a seguir, depois Online, depois por nome
    const otherPeople = Array.from(map.values()).sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });

    return [ownerPerson, ...otherPeople];
  }, [board, currentUser, remoteUsers, isOwner, defaultPermission]);

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
            Defina permissões de acesso, convide colegas por e-mail ou gerencie quem está participando.
          </DialogDescription>
        </DialogHeader>

        {/* 1. Convidar Novo Colaborador ou Convidado */}
        <div className="space-y-2 pt-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Convidar por E-mail ou Nome
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              placeholder="colega@empresa.com ou Nome"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInvite();
                }
              }}
              className="h-8 text-xs flex-1"
            />

            {/* Seletor de Permissão para o convite */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2.5 shrink-0">
                  <span>{PERMISSION_LABELS[inviteRole].label}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                {(['edit', 'comment', 'view'] as BoardPermission[]).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setInviteRole(p)}
                    className="flex flex-col items-start py-1.5 cursor-pointer"
                  >
                    <span className="font-medium">{PERMISSION_LABELS[p].label}</span>
                    <span className="text-[10px] text-muted-foreground">{PERMISSION_LABELS[p].desc}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão de Enviar Convite */}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleInvite}
              disabled={!inviteInput.trim()}
              className="h-8 px-3 text-xs gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              {inviteInput.includes('@') ? (
                <>
                  <Mail className="size-3.5" />
                  <span>Convidar Gmail</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  <span>Adicionar</span>
                </>
              )}
            </Button>
          </div>

          {inviteSuccess && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in duration-200">
              <Check className="size-3" />
              {inviteInput.includes('@')
                ? 'Janela do Gmail aberta e convite registrado!'
                : 'Convidado registrado com sucesso na lista de acesso!'}
            </p>
          )}
        </div>

        <Separator />

        {/* 2. Permissão Geral do Link */}
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
                    placeholder="Defina a senha de acesso..."
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
                            <span className={person.role === 'none' ? 'text-destructive font-semibold' : ''}>
                              {PERMISSION_LABELS[person.role]?.label || 'Pode editar'}
                            </span>
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
                            onClick={() => handleUpdatePersonRole(person, 'none')}
                            className="cursor-pointer justify-between text-amber-600 dark:text-amber-400"
                          >
                            <span>Bloquear acesso</span>
                            {person.role === 'none' && <Check className="size-3" />}
                          </DropdownMenuItem>
                          <Separator className="my-1" />
                          <DropdownMenuItem
                            onClick={() => handleUpdatePersonRole(person, 'remove')}
                            className="text-destructive cursor-pointer"
                          >
                            Remover da lista
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
