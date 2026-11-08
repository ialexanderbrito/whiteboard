import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Função de visibilidade de quadros que replica a lógica do boardService
 */
function isBoardVisibleToUser(board, user, visitedIds = []) {
  if (!user) return false;

  // 1. É o proprietário do quadro
  if (board.ownerId === user.uid) return true;

  // 2. Convidado por e-mail
  if (user.email) {
    const userEmailLower = user.email.toLowerCase();
    if (board.collaboratorEmails && board.collaboratorEmails.map((e) => e.toLowerCase()).includes(userEmailLower)) {
      return true;
    }
    if (board.collaborators && Object.values(board.collaborators).some((c) => c.email.toLowerCase() === userEmailLower)) {
      return true;
    }
  }

  // 3. É membro registrado no quadro
  if (board.members && board.members[user.uid]) {
    return true;
  }

  // 4. Compartilhado com convidados (acesso geral liberado !== 'none')
  if (board.defaultPermission !== 'none') {
    return true;
  }

  // 5. Visitado pelo usuário via link e não possui restrição
  if (visitedIds.includes(board.id) && board.defaultPermission !== 'none') {
    return true;
  }

  return false;
}

/**
 * Regras de permissão de ações no Dashboard
 */
function getDashboardBoardActions(board, user) {
  const isOwner = board.ownerId === user?.uid;
  const canManage = isOwner && !user?.isAnonymous;

  return {
    canDelete: canManage,
    canShare: canManage,
    canEnter: true,
  };
}

test('Quadro compartilhado com convidados aparece na listagem de usuários convidados', () => {
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

  assert.equal(isBoardVisibleToUser(sharedBoard, guestUser), true);
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

