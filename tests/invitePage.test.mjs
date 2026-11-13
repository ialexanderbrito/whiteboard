import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('InvitePage: dedicated invite screen in the login 2-grid pattern', () => {
  const filePath = path.resolve('src/pages/InvitePage.tsx');
  assert.ok(fs.existsSync(filePath), 'InvitePage.tsx must exist as a dedicated route');

  const content = fs.readFileSync(filePath, 'utf-8');

  // Padrão do login: grid de 12 colunas (vitrine à esquerda, card à direita)
  assert.ok(content.includes('lg:grid-cols-12'), 'InvitePage must keep the login two-column grid pattern');
  assert.ok(content.includes('lg:col-span-7'), 'InvitePage showcase must occupy the left columns');
  assert.ok(content.includes('lg:col-span-5'), 'InvitePage card must occupy the right columns');

  // Chamado pessoal com o NOME REAL do dono do quadro (fallback genérico sem snapshot)
  assert.ok(content.includes('te chamou para entrar na sala'), 'InvitePage headline must frame the invite as a personal call to a room');
  assert.ok(content.includes('getInviteSnapshot'), 'InvitePage must fetch the real invite snapshot (host name + board title)');
  assert.ok(content.includes('#b/'), 'InvitePage must reference the shared board address');

  // Identidade própria de convite (badge e rodapé)
  assert.ok(content.includes('Convite // Sala Aberta'), 'InvitePage header badge must say invite');
  assert.ok(content.includes('CONVITE • SALA EM TEMPO REAL'), 'InvitePage footer must say invite');

  // Prova do valor antes do pedido: quadro ao vivo à esquerda, card à direita
  assert.ok(content.includes('InviteBoardShowcase'), 'InvitePage must embed the live board showcase');
  assert.ok(content.includes('InviteCard'), 'InvitePage must embed the invite card');
  assert.ok(content.includes('invite-reveal'), 'InvitePage must use staggered entrance animation');

  // Mesma mecânica de autenticação do login (Google com user gesture + convidado)
  assert.ok(content.includes('signInWithGoogle'), 'InvitePage must support Google sign-in');
  assert.ok(content.includes('signInAsGuest'), 'InvitePage must support guest sign-in');
  assert.ok(content.includes('mirio_auth_redirect'), 'InvitePage must persist redirect for Google flow');

  // Encaixe em tela única
  assert.ok(content.includes('h-screen') || content.includes('100dvh'), 'InvitePage must fit viewport height');
  assert.ok(content.includes('overflow-hidden'), 'InvitePage must clip vertical overflow');
});

test('InviteCard: personal call with real host, no decorative accent strip', () => {
  const filePath = path.resolve('src/components/auth/InviteCard.tsx');
  assert.ok(fs.existsSync(filePath), 'InviteCard.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf-8');

  // Chamada com o nome real do anfitrião (quando o snapshot existe)
  assert.ok(content.includes('te chamou para o quadro'), 'InviteCard must show who made the call');
  assert.ok(content.includes('hostName'), 'InviteCard must accept the real host name');
  assert.ok(content.includes('na sala'), 'InviteCard must show the host is in the room right now');
  assert.ok(content.includes('Entrar na sala'), 'InviteCard CTA must say join the room (not the workspace)');
  assert.ok(content.includes('Seu nome na sala'), 'InviteCard guest field must be room-framed');

  // Sem faixa de acento decorativa no topo do card
  assert.ok(!content.includes('h-0.5'), 'InviteCard must NOT have the decorative accent strip');

  // Reaproveita a formatação de erro compartilhada do auth
  assert.ok(content.includes('formatAuthError'), 'InviteCard must reuse the shared auth error formatting');
});

test('InviteBoardShowcase: own room narrative, distinct from the login showcase', () => {
  const filePath = path.resolve('src/components/auth/InviteBoardShowcase.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Nomes próprios da vitrine de convite (diferentes do time fictício do login)
  assert.ok(content.includes('Marina T.'), 'Showcase must feature Marina T. (not the login fictional team)');
  assert.ok(content.includes('Pedro A.'), 'Showcase must feature Pedro A. (not the login fictional team)');
  assert.ok(!content.includes('Sofia'), 'Showcase must not reuse the login showcase fictional names');
  assert.ok(!content.includes('Lucas'), 'Showcase must not reuse the login showcase fictional names');

  // Anfitrião REAL do quadro (nome dinâmico do dono)
  assert.ok(content.includes('hostName'), 'Showcase must accept the real host name');
  assert.ok(content.includes('boardTitle'), 'Showcase must accept the real board title');

  // Ações novas (diferentes das reações da vitrine de login)
  assert.ok(content.includes('👋'), 'Showcase must use the wave action');
  assert.ok(content.includes('✅'), 'Showcase must use the check action');
  assert.ok(content.includes('#b/'), 'Showcase must display the board address chip');
});

test('boardService: public invite snapshot with only safe fields', () => {
  const filePath = path.resolve('src/services/boardService.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('syncInviteSnapshot'), 'boardService must write the invite snapshot');
  assert.ok(content.includes('getInviteSnapshot'), 'boardService must read the invite snapshot');
  assert.ok(content.includes("'invites'"), 'boardService must target the invites collection');

  // O snapshot NUNCA pode conter dados sensíveis (senha, membros, permissões)
  const snapshotBlock = content.slice(content.indexOf('async syncInviteSnapshot'), content.indexOf('async getInviteSnapshot'));
  assert.ok(!snapshotBlock.includes('password'), 'Invite snapshot must never include the password hash');
  assert.ok(!snapshotBlock.includes('members'), 'Invite snapshot must never include members');
  assert.ok(snapshotBlock.includes('ownerName'), 'Invite snapshot must carry the real owner name');
});

test('firestore.rules: invites collection readable publicly, writable only by the board owner', () => {
  const rulesPath = path.resolve('firestore.rules');
  const content = fs.readFileSync(rulesPath, 'utf-8');

  const invitesIndex = content.indexOf('match /invites/{boardId}');
  assert.ok(invitesIndex > -1, 'Rules must define the invites collection');
  const invitesBlock = content.slice(invitesIndex, content.indexOf('}', content.indexOf('allow update', invitesIndex)));

  assert.ok(invitesBlock.includes('allow read: if true'), 'Invite snapshot must be readable without authentication');
  assert.ok(invitesBlock.includes('ownerId == request.auth.uid'), 'Invite snapshot writes must be restricted to the board owner');
});

test('BoardPage: unauthenticated access redirects to the invite screen, not generic login', () => {
  const filePath = path.resolve('src/pages/BoardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('/invite/'), 'BoardPage must redirect unauthenticated users to /invite/:boardId');
  assert.ok(!content.includes('/login?redirect='), 'BoardPage must not fall back to the generic login screen');
});

test('index.css: invite animations exist and reduced motion keeps content visible', () => {
  const cssPath = path.resolve('src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes invite-reveal'), 'Must define invite-reveal keyframes');
  assert.ok(css.includes('@keyframes invite-dash-flow'), 'Must define invite-dash-flow keyframes');

  const reducedIndex = css.indexOf('prefers-reduced-motion');
  const revealIndex = css.indexOf('.animate-invite-reveal {', reducedIndex);
  assert.ok(revealIndex > -1, 'Reduced motion must keep invite-reveal content visible (opacity override)');
});
