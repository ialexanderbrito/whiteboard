import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowWaitingRoom, getUserBoardPermission, isBoardOwner } from '../src/utils/permissions.ts';

test('isBoardOwner identifica corretamente o dono do quadro', () => {
  const board = {
    id: 'b1',
    title: 'Meu Quadro',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
  };

  const ownerUser = { uid: 'owner_123', displayName: 'Alexander', email: null, photoURL: null, isAnonymous: false, color: '#3b82f6' };
  const guestUser = { uid: 'guest_456', displayName: 'Visitante', email: null, photoURL: null, isAnonymous: true, color: '#10b981' };

  assert.equal(isBoardOwner(board, ownerUser), true);
  assert.equal(isBoardOwner(board, guestUser), false);
});

test('shouldShowWaitingRoom: dono do quadro nunca passa pela Sala de Espera', () => {
  const board = {
    id: 'b1',
    title: 'Quadro da Equipe',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: true,
  };

  const ownerUser = { uid: 'owner_123', displayName: 'Alexander', email: null, photoURL: null, isAnonymous: false, color: '#3b82f6' };
  assert.equal(shouldShowWaitingRoom(board, ownerUser), false);
});

test('shouldShowWaitingRoom: novo visitante via link vai para a Sala de Espera por padrão', () => {
  const board = {
    id: 'b1',
    title: 'Sprint Planning',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: true,
    defaultPermission: 'edit',
  };

  const visitor = { uid: 'guest_789', displayName: 'Convidado Novo', email: null, photoURL: null, isAnonymous: true, color: '#ef4444' };
  assert.equal(shouldShowWaitingRoom(board, visitor), true);
  assert.equal(getUserBoardPermission(board, visitor), 'none');
});

test('shouldShowWaitingRoom: visitante entra direto se o anfitrião desativou a Sala de Espera', () => {
  const board = {
    id: 'b1',
    title: 'Quadro Aberto ao Público',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: false,
    defaultPermission: 'edit',
  };

  const visitor = { uid: 'guest_789', displayName: 'Convidado Qualquer', email: null, photoURL: null, isAnonymous: true, color: '#ef4444' };
  assert.equal(shouldShowWaitingRoom(board, visitor), false);
  assert.equal(getUserBoardPermission(board, visitor), 'edit');
});

test('shouldShowWaitingRoom: colaborador convidado por e-mail pula a Sala de Espera', () => {
  const board = {
    id: 'b1',
    title: 'Quadro Estratégico',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: true,
    collaboratorEmails: ['beatriz@example.com'],
    collaborators: {
      beatriz_email: {
        email: 'beatriz@example.com',
        role: 'edit',
        addedAt: Date.now(),
      },
    },
  };

  const collaborator = { uid: 'user_beatriz', displayName: 'Beatriz', email: 'beatriz@example.com', photoURL: null, isAnonymous: false, color: '#8b5cf6' };
  assert.equal(shouldShowWaitingRoom(board, collaborator), false);
  assert.equal(getUserBoardPermission(board, collaborator), 'edit');
});

test('shouldShowWaitingRoom: convidado removido que tenta reentrar pelo link DEVE passar pela Sala de Espera para aprovação', () => {
  const board = {
    id: 'b1',
    title: 'Quadro com Convidado Removido',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: true,
    defaultPermission: 'edit',
    removedMemberIds: ['guest_kicked_456'],
    members: {
      guest_kicked_456: {
        uid: 'guest_kicked_456',
        name: 'Convidado Removido',
        role: 'none',
        joinedAt: Date.now() - 5000,
      },
    },
  };

  const kickedGuest = { uid: 'guest_kicked_456', displayName: 'Convidado Removido', email: null, photoURL: null, isAnonymous: true, color: '#f59e0b' };

  // 1. Deve ser direcionado para a Sala de Espera
  assert.equal(shouldShowWaitingRoom(board, kickedGuest), true);
  assert.equal(getUserBoardPermission(board, kickedGuest), 'none');

  // 2. Quando o anfitrião aprova o convidado novamente com papel de 'edit'
  const approvedBoard = {
    ...board,
    removedMemberIds: [], // Desbloqueado da lista de removidos
    joinRequests: {
      guest_kicked_456: {
        uid: 'guest_kicked_456',
        name: 'Convidado Removido',
        status: 'approved',
        assignedRole: 'edit',
        requestedAt: Date.now() - 2000,
        respondedAt: Date.now() - 1000,
      },
    },
    members: {
      guest_kicked_456: {
        uid: 'guest_kicked_456',
        name: 'Convidado Removido',
        role: 'edit',
        joinedAt: Date.now() - 5000,
      },
    },
  };

  assert.equal(shouldShowWaitingRoom(approvedBoard, kickedGuest), false);
  assert.equal(getUserBoardPermission(approvedBoard, kickedGuest), 'edit');
});

test('getUserBoardPermission: respeita papel escolhido pelo anfitrião ao aprovar (ex: visualizador)', () => {
  const board = {
    id: 'b1',
    title: 'Apresentação de Projeto',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: true,
    defaultPermission: 'edit',
    joinRequests: {
      guest_viewer: {
        uid: 'guest_viewer',
        name: 'Observador',
        status: 'approved',
        assignedRole: 'view',
        requestedAt: Date.now() - 3000,
        respondedAt: Date.now() - 1000,
      },
    },
  };

  const viewerUser = { uid: 'guest_viewer', displayName: 'Observador', email: null, photoURL: null, isAnonymous: true, color: '#6366f1' };
  assert.equal(shouldShowWaitingRoom(board, viewerUser), false);
  assert.equal(getUserBoardPermission(board, viewerUser), 'view');
});

test('getUserBoardPermission: se o anfitrião recusa a solicitação, o convidado permanece sem acesso', () => {
  const board = {
    id: 'b1',
    title: 'Sessão Fechada',
    ownerId: 'owner_123',
    ownerName: 'Alexander',
    waitingRoomEnabled: true,
    defaultPermission: 'edit',
    joinRequests: {
      guest_rejected: {
        uid: 'guest_rejected',
        name: 'Visitante Não Aceito',
        status: 'rejected',
        requestedAt: Date.now() - 3000,
        respondedAt: Date.now() - 1000,
      },
    },
  };

  const rejectedUser = { uid: 'guest_rejected', displayName: 'Visitante Não Aceito', email: null, photoURL: null, isAnonymous: true, color: '#ef4444' };
  assert.equal(shouldShowWaitingRoom(board, rejectedUser), true);
  assert.equal(getUserBoardPermission(board, rejectedUser), 'none');
});

test('LGPD e Privacidade: WaitingRoomScreen não expõe nome do proprietário nem seu status online/ausente', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const filePath = path.resolve('src/components/whiteboard/WaitingRoomScreen.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Não deve expor o nome do dono/anfitrião
  assert.equal(content.includes('board.ownerName'), false, 'Não deve exibir o nome do anfitrião por LGPD');
  assert.equal(content.includes('isHostOnline'), false, 'Não deve verificar nem exibir se o anfitrião está online');
  assert.equal(content.includes('Presente no quadro'), false, 'Não deve exibir status de presença do proprietário');
  assert.equal(content.includes('Ausente no momento'), false, 'Não deve exibir se o proprietário está ausente');

  // Deve informar de forma genérica e discreta
  assert.ok(content.includes('Aguardando aprovação do proprietário ao quadro...'), 'Deve informar genericamente sobre aguardar aprovação');
});

test('ShareModal: usuários revogados são removidos completamente e não exibem opção de re-adicionar', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const filePath = path.resolve('src/components/whiteboard/ShareModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Não deve exibir botão ou opção de Re-adicionar na UI
  assert.equal(content.includes('Re-adicionar'), false, 'Não deve existir botão de Re-adicionar');
  // Não deve exibir a opção/toggle de Sala de Espera (Aprovação) no modal
  assert.equal(content.includes('Sala de Espera (Aprovação)'), false, 'Não deve exibir o toggle da Sala de Espera no modal');
  // Deve oferecer a opção de "Revogar acesso"
  assert.ok(content.includes('Revogar acesso'), 'Deve existir a opção de Revogar acesso');
  // Usuários com role === "none" ou presentes em effectiveRemovedSet são filtrados
  assert.ok(content.includes('m.role === \'none\''), 'Deve filtrar membros com role === "none"');
});
