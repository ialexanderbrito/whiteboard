import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserBoardPermission, isBoardOwner } from '../src/utils/permissions.ts';

/**
 * Função de visibilidade de quadros que replica a lógica do boardService
 */
function isBoardVisibleToUser(board, user, visitedIds = []) {
  if (!user) return false;

  const userEmailLower = user.email ? user.email.toLowerCase() : null;
  const isReinvited = Boolean(
    (userEmailLower && (
      (board.collaboratorEmails && board.collaboratorEmails.map((e) => String(e).toLowerCase()).includes(userEmailLower)) ||
      (board.collaborators && Object.values(board.collaborators).some((c) => c?.email && String(c.email).toLowerCase() === userEmailLower))
    )) ||
    (board.members && board.members[user.uid] && board.members[user.uid].role !== 'none')
  );

  // Se o usuário foi expressamente removido pelo proprietário deste quadro e não foi re-adicionado, não exibe
  if (!isReinvited) {
    if (board.removedMemberIds && board.removedMemberIds.includes(user.uid)) {
      return false;
    }
    if (board.members && board.members[user.uid]?.role === 'none') {
      return false;
    }
  }

  // 1. É o proprietário do quadro
  if (board.ownerId === user.uid) return true;

  // 2. Convidado por e-mail
  if (user.email) {
    if (board.collaboratorEmails && board.collaboratorEmails.map((e) => e.toLowerCase()).includes(userEmailLower)) {
      return true;
    }
    if (board.collaborators && Object.values(board.collaborators).some((c) => c.email.toLowerCase() === userEmailLower)) {
      return true;
    }
  }

  // 3. É membro registrado no quadro com acesso liberado (role !== 'none')
  if (board.members && board.members[user.uid] && board.members[user.uid].role !== 'none') {
    return true;
  }

  // 4. Visitado pelo usuário via link direto e não possui restrição
  if (visitedIds.includes(board.id) && board.defaultPermission !== 'none') {
    return true;
  }

  return false;
}

/**
 * Regras de permissão de ações no Dashboard
 */
function getDashboardBoardActions(board, user) {
  const isOwner = Boolean(board?.ownerId && user?.uid && board.ownerId === user.uid);
  const canManage = isOwner;

  return {
    canDelete: canManage,
    canShare: canManage,
    canEnter: true,
  };
}

test('Quadro não compartilhado não aparece no dashboard de convidado que entra diretamente no site', () => {
  const unsharedBoard = {
    id: 'x3nn0eru',
    title: '#00 - Mirio',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'edit',
  };

  const directGuest = {
    uid: 'guest_abc999',
    displayName: 'Convidado Visitante',
    email: null,
    isAnonymous: true,
  };

  // Convidado entra diretamente no site sem ter visitado o link específico do quadro
  assert.equal(isBoardVisibleToUser(unsharedBoard, directGuest, []), false);
});

test('Quadro acessado via link pelo convidado aparece no histórico/dashboard dele', () => {
  const sharedBoard = {
    id: 'board123',
    title: 'Sprint Planning Equipe',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'edit',
  };

  const guestUser = {
    uid: 'guest_abc999',
    displayName: 'Convidado Visitante',
    email: null,
    isAnonymous: true,
  };

  assert.equal(isBoardVisibleToUser(sharedBoard, guestUser, ['board123']), true);
});

test('Usuário/Convidado removido da lista pelo proprietário perde acesso e o quadro desaparece do dashboard', () => {
  const boardWithRemoved = {
    id: 'x3nn0eru',
    title: '#00 - Mirio',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'edit',
    removedMemberIds: ['guest_abc999'],
  };

  const removedGuest = {
    uid: 'guest_abc999',
    displayName: 'Convidado Removido',
    email: null,
    isAnonymous: true,
  };

  // Mesmo que o quadro estivesse no histórico local (visitedIds), a remoção impede a exibição
  assert.equal(isBoardVisibleToUser(boardWithRemoved, removedGuest, ['x3nn0eru']), false);
});

test('Quadro privado (defaultPermission: none) não aparece para convidados não autorizados', () => {
  const privateBoard = {
    id: 'board_secret',
    title: 'Planejamento Confidencial',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'none',
  };

  const guestUser = {
    uid: 'guest_xyz123',
    displayName: 'Convidado Qualquer',
    email: null,
    isAnonymous: true,
  };

  assert.equal(isBoardVisibleToUser(privateBoard, guestUser), false);
});

test('Convidado em quadro compartilhado não pode apagar nem compartilhar, apenas entrar', () => {
  const sharedBoard = {
    id: 'board123',
    title: 'Retrospectiva Ágil',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'edit',
  };

  const guestUser = {
    uid: 'guest_abc999',
    displayName: 'Convidado Visitante',
    email: null,
    isAnonymous: true,
  };

  const actions = getDashboardBoardActions(sharedBoard, guestUser);

  assert.equal(actions.canDelete, false, 'Convidado não pode apagar');
  assert.equal(actions.canShare, false, 'Convidado não pode compartilhar');
  assert.equal(actions.canEnter, true, 'Convidado pode entrar');
});

test('Proprietário registrado possui permissão total de apagar, compartilhar e entrar', () => {
  const myBoard = {
    id: 'board123',
    title: 'Meu Quadro Pessoal',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'edit',
  };

  const ownerUser = {
    uid: 'owner_alexander',
    displayName: 'Alexander',
    email: 'alex@example.com',
    isAnonymous: false,
  };

  const actions = getDashboardBoardActions(myBoard, ownerUser);

  assert.equal(actions.canDelete, true, 'Proprietário pode apagar');
  assert.equal(actions.canShare, true, 'Proprietário pode compartilhar');
  assert.equal(actions.canEnter, true, 'Proprietário pode entrar');
});

test('Convidado que cria o quadro é o proprietário e possui permissão total de apagar e gerenciar seu próprio quadro', () => {
  const guestCreatedBoard = {
    id: 'board_guest_456',
    title: 'Brainstorm do Convidado',
    ownerId: 'guest_user_123',
    ownerName: 'Beatriz',
    defaultPermission: 'edit',
  };

  const guestCreator = {
    uid: 'guest_user_123',
    displayName: 'Beatriz',
    email: null,
    isAnonymous: true,
  };

  const actions = getDashboardBoardActions(guestCreatedBoard, guestCreator);

  assert.equal(actions.canDelete, true, 'Convidado criador pode apagar');
  assert.equal(actions.canShare, true, 'Convidado criador pode compartilhar');
  assert.equal(actions.canEnter, true, 'Convidado criador pode entrar');
});

test('Usuário que entra com conta Google em quadro criado por convidado NÃO se torna dono e não tem permissão de apagar', () => {
  const guestCreatedBoard = {
    id: 'board_guest_456',
    title: 'Brainstorm do Convidado',
    ownerId: 'guest_user_123',
    ownerName: 'Beatriz',
    defaultPermission: 'edit',
  };

  const invitedGoogleUser = {
    uid: 'google_user_999',
    displayName: 'Carlos Convidado Google',
    email: 'carlos@gmail.com',
    isAnonymous: false,
  };

  const actions = getDashboardBoardActions(guestCreatedBoard, invitedGoogleUser);

  assert.equal(actions.canDelete, false, 'Usuário Google convidado NÃO pode apagar');
  assert.equal(actions.canShare, false, 'Usuário Google convidado NÃO pode gerenciar como dono');
  assert.equal(actions.canEnter, true, 'Usuário Google convidado pode entrar para colaborar');
});

test('Filtro de busca tolera quadros com título nulo ou indefinido sem lançar TypeError', () => {
  const boardsWithUndefined = [
    { id: '1', title: undefined },
    { id: '2', title: null },
    { id: '3', title: 'Quadro Válido' },
  ];

  const searchQuery = 'válido';
  const filtered = boardsWithUndefined.filter((b) => {
    const title = (b?.title || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase().trim();
    return title.includes(query);
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '3');
});

test('Usuário previamente removido que é re-convidado ou re-adicionado recupera visibilidade no dashboard', () => {
  const removedUser = {
    uid: 'guest_user_999',
    displayName: 'Carlos Convidado',
    email: 'carlos@example.com',
    isAnonymous: false,
  };

  const boardWithRemoved = {
    id: 'board_team_1',
    title: 'Projeto Equipe',
    ownerId: 'owner_alexander',
    ownerName: 'Alexander',
    defaultPermission: 'edit',
    removedMemberIds: ['guest_user_999'],
    members: {
      guest_user_999: {
        uid: 'guest_user_999',
        name: 'Carlos Convidado',
        email: 'carlos@example.com',
        role: 'none',
      },
    },
  };

  // 1. Enquanto está removido e sem re-convite, não fica visível
  assert.equal(isBoardVisibleToUser(boardWithRemoved, removedUser, ['board_team_1']), false);

  // 2. Quando o dono re-adiciona o membro alterando o papel para 'edit'
  const boardReAdded = {
    ...boardWithRemoved,
    members: {
      guest_user_999: {
        uid: 'guest_user_999',
        name: 'Carlos Convidado',
        email: 'carlos@example.com',
        role: 'edit',
      },
    },
  };
  assert.equal(isBoardVisibleToUser(boardReAdded, removedUser, ['board_team_1']), true);

  // 3. Quando o dono re-convida o usuário pelo e-mail
  const boardReinvitedByEmail = {
    ...boardWithRemoved,
    members: {}, // uid sem role direto
    collaboratorEmails: ['carlos@example.com'],
    collaborators: {
      carlos_hash: {
        email: 'carlos@example.com',
        role: 'view',
        addedAt: Date.now(),
      },
    },
  };
  assert.equal(isBoardVisibleToUser(boardReinvitedByEmail, removedUser, ['board_team_1']), true);
});

test('getUserBoardPermission concede permissão para usuário re-adicionado mesmo se seu UID constava em removedMemberIds', () => {
  const user = {
    uid: 'guest_user_999',
    displayName: 'Carlos Convidado',
    email: 'carlos@example.com',
    isAnonymous: false,
  };

  // Caso 1: Usuário removido tem permissão 'none'
  const boardRemoved = {
    id: 'board_test',
    ownerId: 'owner_123',
    defaultPermission: 'edit',
    removedMemberIds: ['guest_user_999'],
    members: {
      guest_user_999: {
        uid: 'guest_user_999',
        name: 'Carlos Convidado',
        role: 'none',
      },
    },
  };
  assert.equal(getUserBoardPermission(boardRemoved, user), 'none');

  // Caso 2: Usuário re-adicionado diretamente em members com role 'edit'
  const boardRestored = {
    id: 'board_test',
    ownerId: 'owner_123',
    defaultPermission: 'edit',
    removedMemberIds: ['guest_user_999'], // Mesmo com ID resíduo, o role explícito tem precedência
    members: {
      guest_user_999: {
        uid: 'guest_user_999',
        name: 'Carlos Convidado',
        role: 'edit',
      },
    },
  };
  assert.equal(getUserBoardPermission(boardRestored, user), 'edit');

  // Caso 3: Usuário re-convidado por e-mail em collaborators
  const boardReinvited = {
    id: 'board_test',
    ownerId: 'owner_123',
    defaultPermission: 'edit',
    removedMemberIds: ['guest_user_999'],
    collaborators: {
      collab_1: {
        email: 'carlos@example.com',
        role: 'comment',
        addedAt: Date.now(),
      },
    },
  };
  assert.equal(getUserBoardPermission(boardReinvited, user), 'comment');
});

test('isBoardOwner garante estritamente que apenas o criador original (ownerId === user.uid) é dono', () => {
  const guestCreatedBoard = {
    id: 'board_guest_abc',
    ownerId: 'guest_uid_111',
    ownerName: 'Visitante Inicial',
    defaultPermission: 'edit',
  };

  const guestCreator = { uid: 'guest_uid_111', isAnonymous: true };
  const googleInvitee = { uid: 'google_uid_222', email: 'google@gmail.com', isAnonymous: false };

  assert.equal(isBoardOwner(guestCreatedBoard, guestCreator), true);
  assert.equal(isBoardOwner(guestCreatedBoard, googleInvitee), false);
  assert.equal(isBoardOwner(guestCreatedBoard, null), false);
});


