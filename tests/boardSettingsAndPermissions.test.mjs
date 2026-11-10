import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('BoardPasswordSettingsModal: component exists and exports properly', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'BoardPasswordSettingsModal.tsx');
  assert.ok(fs.existsSync(filePath), 'BoardPasswordSettingsModal.tsx should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('export const BoardPasswordSettingsModal'), 'Must export BoardPasswordSettingsModal');
  assert.ok(content.includes('isPasswordProtected'), 'Must manage isPasswordProtected setting');
  assert.ok(content.includes('active:scale-[0.97]'), 'Must use Emil Kowalski responsive press feedback active:scale');
  assert.ok(content.includes('Remover Senha'), 'Must provide remove password action');
  assert.ok(content.includes('zoom-in-95'), 'Must animate dialog smoothly from 0.95 scale');
});

test('BoardPermissionsModal: component exists and exports properly with error boundary', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'BoardPermissionsModal.tsx');
  assert.ok(fs.existsSync(filePath), 'BoardPermissionsModal.tsx should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('export const BoardPermissionsModal'), 'Must export BoardPermissionsModal');
  assert.ok(content.includes('ModalErrorBoundary'), 'Must wrap modal content with ModalErrorBoundary to prevent white screen crashes');
  assert.ok(content.includes('Qualquer pessoa com o link'), 'Must include general link permission setting');
  assert.ok(!content.includes('Convidar por E-mail'), 'Must not include email collaborator invite form');
  assert.ok(content.includes('Link de Compartilhamento Direto'), 'Must include direct link sharing');
  assert.ok(content.includes('Pessoas com Acesso'), 'Must list members and collaborators with individual roles');
  assert.ok(content.includes('Remover acesso'), 'Must allow removing user access');
  assert.ok(content.includes('active:scale-[0.97]'), 'Must use Emil Kowalski responsive press feedback');
});

test('BoardPermissionsModal: defensive data handling prevents crashes on legacy or corrupted board shapes', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'BoardPermissionsModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Must have safe fallback for defaultPermission
  assert.ok(content.includes('PERMISSION_CONFIG[defaultPermission] || PERMISSION_CONFIG.edit'), 'Must safely fallback if permission key is unknown');
  // Must verify Array.isArray for removedMemberIds
  assert.ok(content.includes('Array.isArray(board.removedMemberIds)'), 'Must check Array.isArray for removedMemberIds');
  // Must safely verify objects for members and collaborators
  assert.ok(content.includes("typeof board.members === 'object'"), 'Must guard board.members object type');
  assert.ok(content.includes("typeof board.collaborators === 'object'"), 'Must guard board.collaborators object type');
});

test('BoardPermissionsModal: respects React Rules of Hooks (all hooks declared before early return)', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'whiteboard', 'BoardPermissionsModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  const useMemoIndex = content.indexOf('const memberList = useMemo');
  const earlyReturnIndex = content.indexOf('if (!board) return null;');

  assert.ok(useMemoIndex !== -1, 'useMemo must be declared');
  assert.ok(earlyReturnIndex !== -1, 'Early return when board is null must exist');
  assert.ok(
    useMemoIndex < earlyReturnIndex,
    'useMemo hook must be invoked BEFORE the early return if (!board) return null to ensure identical hook counts across renders'
  );
});

test('DashboardPage: 3-dots menu contains Renomear, Permissões de Acesso, Proteção por Senha', () => {
  const filePath = path.join(projectRoot, 'src', 'pages', 'DashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('Renomear'), 'Dashboard menu must contain Renomear');
  assert.ok(content.includes('Permissões de Acesso'), 'Dashboard menu must contain Permissões de Acesso');
  assert.ok(content.includes('Proteção por Senha'), 'Dashboard menu must contain Proteção por Senha');
  assert.ok(content.includes('inlineEditingBoardId'), 'Dashboard must implement inline title renaming');
  assert.ok(content.includes('BoardPasswordSettingsModal'), 'Dashboard must render BoardPasswordSettingsModal');
  assert.ok(content.includes('BoardPermissionsModal'), 'Dashboard must render BoardPermissionsModal');
});

test('DashboardPage: visual indicators for password protection and privacy', () => {
  const filePath = path.join(projectRoot, 'src', 'pages', 'DashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('isPasswordProtected'), 'Dashboard must check isPasswordProtected');
  assert.ok(content.includes('Lock className='), 'Dashboard must show lock icon when password protected');
  assert.ok(content.includes('Privado'), 'Dashboard must show Privado badge when permission is none');
});

test('DashboardPage: Table view has matching 3-dots menu for consistency with stopPropagation', () => {
  const filePath = path.join(projectRoot, 'src', 'pages', 'DashboardPage.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Both grid and table have the dropdown menu
  const matches = (content.match(/Mais opções do quadro/g) || []).length;
  assert.ok(matches >= 2, 'Both Card Grid and Table view must have the 3-dots action menu for consistency');
});
