import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('FacilitationMenu: dedicated to collaborative facilitation & dynamic activities', () => {
  const componentPath = path.resolve('src/components/whiteboard/FacilitationMenu.tsx');
  assert.ok(fs.existsSync(componentPath), 'FacilitationMenu.tsx deve existir');

  const content = fs.readFileSync(componentPath, 'utf8');
  assert.match(content, /export const FacilitationMenu:/, 'Deve exportar FacilitationMenu');
  assert.match(content, /export interface FacilitationMenuProps/, 'Deve exportar FacilitationMenuProps');

  // Verifica que não contém mais abas misturadas ou controles visuais de tema/grade
  assert.doesNotMatch(content, /<Tabs/, 'Não deve conter abas misturando temas e ferramentas');
  assert.doesNotMatch(content, /onChangeGridType/, 'Não deve conter controles de grade');
  assert.doesNotMatch(content, /setTheme/, 'Não deve conter controle de tema');

  // Verifica ferramentas de facilitação colaborativa
  assert.match(content, /Reações Rápidas/, 'Deve conter seção de Reações Rápidas');
  assert.match(content, /Timer Coletivo/, 'Deve conter Timer Coletivo');
  assert.match(content, /Sessão de Votação/, 'Deve conter Sessão de Votação');
  assert.match(content, /Modo Apresentação/, 'Deve conter Modo Apresentação');

  // Indicador de status dinâmico (badge de Timer ou Votação ativos)
  assert.match(content, /animate-ping/, 'Deve conter badge animado para indicar atividades ativas');
  assert.match(content, /isVotingActive/, 'Deve reagir à votação ativa');
  assert.match(content, /isTimerOpen/, 'Deve reagir ao timer ativo');
});

test('CanvasPreferencesMenu: dedicated to visual preferences, theme, and canvas grid', () => {
  const componentPath = path.resolve('src/components/whiteboard/CanvasPreferencesMenu.tsx');
  assert.ok(fs.existsSync(componentPath), 'CanvasPreferencesMenu.tsx deve existir');

  const content = fs.readFileSync(componentPath, 'utf8');
  assert.match(content, /export const CanvasPreferencesMenu:/, 'Deve exportar CanvasPreferencesMenu');
  assert.match(content, /export interface CanvasPreferencesMenuProps/, 'Deve exportar CanvasPreferencesMenuProps');

  // Controles de tema e layout
  assert.match(content, /Tema do Mirio/, 'Deve conter seletor de tema');
  assert.match(content, /Posição da Barra de Ferramentas/, 'Deve conter seletor de posição da barra');

  // Colaboração & Cursores
  assert.match(content, /Cursores dos Colegas/, 'Deve conter toggle para cursores remotos');

  // Grade do Canvas
  assert.match(content, /Grade do Canvas/, 'Deve conter controles da grade');
  assert.match(content, /hybrid/, 'Deve suportar estilo híbrido');
  assert.match(content, /isometric/, 'Deve suportar estilo isométrico');
  assert.match(content, /Opacidade/, 'Deve suportar ajuste de opacidade da grade');
  assert.match(content, /Densidade/, 'Deve suportar ajuste de densidade');
});

test('Emil Kowalski design engineering principles are respected in both menus', () => {
  const facilitationPath = path.resolve('src/components/whiteboard/FacilitationMenu.tsx');
  const preferencesPath = path.resolve('src/components/whiteboard/CanvasPreferencesMenu.tsx');
  const fContent = fs.readFileSync(facilitationPath, 'utf8');
  const pContent = fs.readFileSync(preferencesPath, 'utf8');

  for (const [name, content] of [['FacilitationMenu', fContent], ['CanvasPreferencesMenu', pContent]]) {
    // 1. Never animate from scale(0)
    assert.doesNotMatch(content, /scale\(0\)/, `${name}: nunca deve animar a partir de scale(0)`);
    assert.match(content, /zoom-in-95/, `${name}: deve entrar a partir de escala natural zoom-in-95`);

    // 2. Specific transitions (not transition: all)
    assert.doesNotMatch(content, /transition-all/, `${name}: evitar transition-all; especificar propriedades exatas`);

    // 3. Tactile active press
    assert.match(content, /active:scale-\[0\.9[3-8]\]/, `${name}: deve ter feedback tátil ao pressionar`);

    // 4. Transform origin awareness
    assert.match(content, /var\(--radix-popover-content-transform-origin\)/, `${name}: popover deve escalar a partir do gatilho`);
  }
});

test('Navbar: groups FacilitationMenu in collaboration cluster and CanvasPreferencesMenu in utilities cluster', () => {
  const navbarPath = path.resolve('src/components/layout/Navbar.tsx');
  const content = fs.readFileSync(navbarPath, 'utf8');

  assert.match(content, /import \{ FacilitationMenu \} from '@\/components\/whiteboard\/FacilitationMenu';/, 'Deve importar FacilitationMenu');
  assert.match(content, /import \{ CanvasPreferencesMenu \} from '@\/components\/whiteboard\/CanvasPreferencesMenu';/, 'Deve importar CanvasPreferencesMenu');

  const facilitationIdx = content.indexOf('<FacilitationMenu');
  const preferencesIdx = content.indexOf('<CanvasPreferencesMenu');
  const shareIdx = content.indexOf('isBoardOwner(board');

  assert.ok(facilitationIdx !== -1, 'FacilitationMenu deve ser renderizado na Navbar');
  assert.ok(preferencesIdx !== -1, 'CanvasPreferencesMenu deve ser renderizado na Navbar');
  assert.ok(facilitationIdx < preferencesIdx, 'FacilitationMenu deve vir antes de CanvasPreferencesMenu');
  assert.ok(preferencesIdx < shareIdx, 'CanvasPreferencesMenu deve ficar antes do botão de Compartilhar nos utilitários');
});
