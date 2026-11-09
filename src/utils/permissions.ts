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

  // 2. Verifica se o usuário tem papel específico atribuído por UID em members
  if (board.members && board.members[user.uid]?.role) {
    const memberRole = board.members[user.uid].role!;
    if (memberRole === 'none') {
      return 'none';
    }
    // Papel explícito ativo (edit, comment, view) concedido ao membro
    return memberRole;
  }

  // 3. Verifica se o usuário foi convidado explicitamente pelo e-mail (re-convites por e-mail têm precedência)
  if (user.email && board.collaborators) {
    const userEmail = user.email.trim().toLowerCase();
    const collab = Object.values(board.collaborators).find(
      (c) => c.email && c.email.trim().toLowerCase() === userEmail
    );
    if (collab) {
      return collab.role;
    }
  }

  // 4. Se o usuário foi expressamente removido pelo proprietário do quadro (e não foi re-adicionado)
  if (board.removedMemberIds && board.removedMemberIds.includes(user.uid)) {
    return 'none';
  }

  // 5. Se o quadro foi desbloqueado com senha válida e a permissão padrão era 'none',
  // concede permissão de edição por ter validado a senha do proprietário.
  if (isPasswordUnlocked && board.isPasswordProtected) {
    if (!board.defaultPermission || board.defaultPermission === 'none') {
      return 'edit';
    }
    return board.defaultPermission;
  }

  // 6. Permissão configurada para qualquer pessoa com o link
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
