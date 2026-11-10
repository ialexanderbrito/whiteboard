import type { Board, BoardPermission, CurrentUser } from '../types/board';

/**
 * Calcula o nível de permissão efetivo de um usuário em relação a um quadro.
 * @param board Objeto do quadro
 * @param user Usuário atual autenticado
 * @param isPasswordUnlocked Se o usuário desbloqueou o quadro com senha com sucesso
 */
export function isBoardOwner(board: Board | null, user: CurrentUser | null): boolean {
  if (!board || !user || !board.ownerId || !user.uid) return false;
  // O proprietário é estritamente o usuário cujo UID coincide com ownerId do quadro.
  // Usuários convidados que entram com Google em quadros criados por convidados NUNCA devem assumir posse do quadro.
  return board.ownerId === user.uid;
}

/**
 * Determina se um visitante deve aguardar na Sala de Espera para aprovação do anfitrião.
 * O proprietário nunca aguarda.
 * Se a sala de espera estiver ativa (padrão) e o usuário não for um membro/colaborador já aprovado,
 * ele é direcionado para a Sala de Espera.
 */
export function shouldShowWaitingRoom(
  board: Board | null,
  user: CurrentUser | null,
  isPasswordUnlocked = false
): boolean {
  if (!board || !user || !user.uid) return false;
  if (isBoardOwner(board, user)) return false;

  // Se o usuário já desbloqueou o quadro protegido por senha com sucesso
  if (isPasswordUnlocked && board.isPasswordProtected) return false;

  // Se a Sala de Espera foi expressamente desativada pelo proprietário no quadro
  if (board.waitingRoomEnabled === false) return false;

  // Se o usuário foi convidado explicitamente pelo e-mail (re-convite ou convite direto tem prioridade)
  if (user.email && board.collaborators) {
    const userEmail = user.email.trim().toLowerCase();
    const collab = Object.values(board.collaborators).find(
      (c) => c?.email && c.email.trim().toLowerCase() === userEmail
    );
    if (collab && collab.role && collab.role !== 'none') {
      return false;
    }
  }

  // Se o anfitrião já aprovou a solicitação de entrada deste usuário
  const request = board.joinRequests?.[user.uid];
  if (request?.status === 'approved') {
    return false;
  }

  // Se o usuário foi removido pelo proprietário do quadro (via removedMemberIds ou role === 'none'),
  // ele DEVE aguardar aprovação na Sala de Espera para que o anfitrião decida se aceita novamente
  const isRemoved = Boolean(
    (board.removedMemberIds && board.removedMemberIds.includes(user.uid)) ||
    (board.members && board.members[user.uid]?.role === 'none')
  );
  if (isRemoved) {
    return true;
  }

  // Se o usuário já é um membro registrado no quadro com papel ativo (edit/comment/view)
  if (board.members && board.members[user.uid]?.role && board.members[user.uid].role !== 'none') {
    return false;
  }

  // Por padrão, links de novos convidados e visitantes passam pela aprovação do anfitrião
  return true;
}

/**
 * Calcula o nível de permissão efetivo de um usuário em relação a um quadro.
 * @param board Objeto do quadro
 * @param user Usuário atual autenticado
 * @param isPasswordUnlocked Se o usuário desbloqueou o quadro com senha com sucesso
 */
export function getUserBoardPermission(
  board: Board | null,
  user: CurrentUser | null,
  isPasswordUnlocked = false
): BoardPermission {
  if (!board || !user) return 'none';

  // 1. O proprietário do quadro sempre tem permissão total de edição
  if (isBoardOwner(board, user)) {
    return 'edit';
  }

  // 2. Se o usuário foi expressamente removido pelo proprietário do quadro (e não foi re-adicionado com papel ativo)
  const isExplicitlyRemoved = Boolean(
    board.removedMemberIds &&
    board.removedMemberIds.includes(user.uid) &&
    (!board.members?.[user.uid]?.role || board.members[user.uid].role === 'none') &&
    (!user.email || !board.collaborators || !Object.values(board.collaborators).some((c) => c?.email?.toLowerCase() === user.email?.toLowerCase()))
  );
  if (isExplicitlyRemoved) {
    return 'none';
  }

  // 3. Verifica se o usuário tem papel específico atribuído por UID em members
  // A lista de members reflete os membros e suas alterações feitas em tempo real pelo anfitrião
  if (board.members && board.members[user.uid]?.role) {
    const member = board.members[user.uid];
    const memberRole = member.role!;
    if (memberRole === 'none') {
      return 'none';
    }
    // Se o anfitrião definiu ou alterou o papel individualmente, ou se não há defaultPermission divergente
    if (member.hasCustomRole || !board.defaultPermission || board.defaultPermission === memberRole) {
      return memberRole;
    }
    // Se o participante apenas herdou a permissão padrão e a geral foi alterada, segue a geral
    return board.defaultPermission;
  }

  // 4. Se o anfitrião aprovou expressamente a solicitação de entrada na Sala de Espera (fallback caso members ainda não tenha sido registrado)
  if (board.joinRequests && board.joinRequests[user.uid]?.status === 'approved') {
    const assignedRole = board.joinRequests[user.uid].assignedRole;
    if (assignedRole && assignedRole !== 'none') {
      return assignedRole;
    }
  }

  // 5. Verifica se o usuário foi convidado explicitamente pelo e-mail (re-convites por e-mail têm precedência)
  if (user.email && board.collaborators) {
    const userEmail = user.email.trim().toLowerCase();
    const collab = Object.values(board.collaborators).find(
      (c) => c.email && c.email.trim().toLowerCase() === userEmail
    );
    if (collab) {
      return collab.role;
    }
  }

  // 6. Se o usuário precisa de autorização na Sala de Espera e ainda não foi aprovado
  if (shouldShowWaitingRoom(board, user, isPasswordUnlocked)) {
    return 'none';
  }

  // 7. Se o quadro foi desbloqueado com senha válida e a permissão padrão era 'none',
  // concede permissão de edição por ter validado a senha do proprietário.
  if (isPasswordUnlocked && board.isPasswordProtected) {
    if (!board.defaultPermission || board.defaultPermission === 'none') {
      return 'edit';
    }
    return board.defaultPermission;
  }

  // 8. Permissão configurada para qualquer pessoa com o link (quando sala de espera está desativada)
  // Se ainda não estiver definida em quadros legados, o padrão é 'edit'
  return board.defaultPermission ?? 'edit';
}


/**
 * Verifica se o usuário pode editar o conteúdo do quadro.
 */
export function canEditBoard(board: Board | null, user: CurrentUser | null, isPasswordUnlocked = false): boolean {
  return getUserBoardPermission(board, user, isPasswordUnlocked) === 'edit';
}

/**
 * Verifica se o usuário pode pelo menos comentar/reagir no quadro.
 */
export function canCommentBoard(board: Board | null, user: CurrentUser | null, isPasswordUnlocked = false): boolean {
  const perm = getUserBoardPermission(board, user, isPasswordUnlocked);
  return perm === 'edit' || perm === 'comment';
}

/**
 * Verifica se o usuário está em modo estrito de apenas visualização (leitura).
 */
export function isReadOnlyBoard(board: Board | null, user: CurrentUser | null, isPasswordUnlocked = false): boolean {
  return getUserBoardPermission(board, user, isPasswordUnlocked) === 'view';
}

/**
 * Verifica se o usuário não possui acesso ao quadro.
 */
export function hasNoAccessBoard(board: Board | null, user: CurrentUser | null, isPasswordUnlocked = false): boolean {
  return getUserBoardPermission(board, user, isPasswordUnlocked) === 'none';
}
