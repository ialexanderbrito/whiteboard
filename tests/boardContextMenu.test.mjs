import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('BoardContextMenu component file exists and exports BoardContextMenu', () => {
  const componentPath = path.resolve('src/components/whiteboard/BoardContextMenu.tsx');
  assert.ok(fs.existsSync(componentPath), 'BoardContextMenu.tsx deve existir');

  const content = fs.readFileSync(componentPath, 'utf8');
  assert.match(content, /export const BoardContextMenu:/, 'Deve exportar o componente BoardContextMenu');
  assert.match(content, /export interface BoardContextMenuProps/, 'Deve exportar as props do BoardContextMenu');
});

test('BoardContextMenu follows Emil Kowalski animation & craft principles', () => {
  const componentPath = path.resolve('src/components/whiteboard/BoardContextMenu.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  // Emil Kowalski Rule 1: Never animate from scale(0)
  assert.doesNotMatch(content, /scale\(0\)/, 'Nunca deve animar a partir de scale(0)');
  assert.match(content, /zoom-in-95/, 'Deve iniciar a transição a partir de escala natural (zoom-in-95 / scale 0.95-0.96)');

  // Emil Kowalski Rule 2: UI animations under 300ms
  assert.match(content, /duration-150|duration-100/, 'Animações devem ser rápidas e responsivas (< 300ms)');

  // Emil Kowalski Rule 3: Active press feedback
  assert.match(content, /active:scale-\[0\.98\]/, 'Botões devem ter feedback tátil ao pressionar (active:scale-[0.98])');

  // Emil Kowalski Rule 4: Submenus should be floating and origin-aware
  assert.match(content, /transformOrigin: adjustedPos\.origin/, 'Menu deve respeitar a origem do quadrante clicado');
});

test('BoardContextMenu contains all Creation and Board Tools for empty canvas', () => {
  const componentPath = path.resolve('src/components/whiteboard/BoardContextMenu.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  // Itens de criação
  assert.match(content, /Nota Adesiva/, 'Deve conter opção de Nota Adesiva');
  assert.match(content, /Formas/, 'Deve conter opção de Formas');
  assert.match(content, /Texto/, 'Deve conter opção de Texto');
  assert.match(content, /Seta \/ Conector/, 'Deve conter opção de Seta');
  assert.match(content, /Moldura \/ Frame/, 'Deve conter opção de Moldura');

  // Área de transferência e atalhos
  assert.match(content, /Colar aqui/, 'Deve conter opção Colar aqui');
  assert.match(content, /Selecionar Tudo/, 'Deve conter opção Selecionar Tudo');
  assert.match(content, /Modelos de Sprint\.\.\./, 'Deve conter atalho para Templates de Sprint');
  assert.match(content, /Stickers & Emojis\.\.\./, 'Deve conter atalho para Stickers');
  assert.match(content, /Redefinir Zoom/, 'Deve conter opção Redefinir Zoom');
  assert.match(content, /Grade/, 'Deve conter opção para Alternar Grade');
});

test('BoardContextMenu contains Element Object Actions when element is selected', () => {
  const componentPath = path.resolve('src/components/whiteboard/BoardContextMenu.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  // Ações do elemento
  assert.match(content, /Copiar/, 'Deve conter Copiar');
  assert.match(content, /Duplicar/, 'Deve conter Duplicar');
  assert.match(content, /Recortar/, 'Deve conter Recortar');
  assert.match(content, /Bloquear no Quadro|Desbloquear/, 'Deve conter Bloquear/Desbloquear');
  assert.match(content, /Organizar Camadas/, 'Deve conter submenu de Camadas');
  assert.match(content, /Trazer para Frente/, 'Deve conter Trazer para Frente');
  assert.match(content, /Enviar para Trás/, 'Deve conter Enviar para Trás');
  assert.match(content, /Alinhamento/, 'Deve conter submenu de Alinhamento');
  assert.match(content, /Excluir/, 'Deve conter ação de Excluir');
});

test('WhiteboardCanvas intercepts contextmenu and prevents default browser menu', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const content = fs.readFileSync(canvasPath, 'utf8');

  // Intercepta botão direito e previne o menu nativo do navegador
  assert.match(content, /onContextMenu=\{handleStageContextMenu\}/, 'Konva Stage deve interceptar onContextMenu');
  assert.match(content, /onContextMenu=\{\(e\) => \{\s*e\.preventDefault\(\);?\s*\}\}/, 'Container do canvas deve prevenir contextmenu padrão');
  assert.match(content, /<BoardContextMenu/, 'WhiteboardCanvas deve renderizar BoardContextMenu');
});
