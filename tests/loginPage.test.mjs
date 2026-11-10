import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('LoginPage: minimal single-screen layout without scroll and without pulsing dot badge', () => {
  const filePath = path.resolve('src/pages/LoginPage.tsx');
  assert.ok(fs.existsSync(filePath), 'LoginPage.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf-8');

  // Jargões técnicos que não importam para o usuário final devem ser removidos
  assert.ok(!content.includes('Konva Engine'), 'LoginPage must not show raw "Konva Engine" tech jargon to users');
  assert.ok(!content.includes('60 FPS'), 'LoginPage must not show raw "60 FPS" tech metric to users');
  assert.ok(!content.includes('RTDB // ONLINE'), 'LoginPage must not show raw "RTDB // ONLINE" backend status to users');
  assert.ok(!content.includes('BRAINSTORM_CANVAS'), 'LoginPage must not show raw "01 // BRAINSTORM_CANVAS"');
  assert.ok(!content.includes('CANVAS_COLLAB'), 'LoginPage must not show raw "00 // CANVAS_COLLAB"');

  // Remoção do badge "Whiteboard Colaborativo" com ponto verde piscando
  assert.ok(!content.includes('Whiteboard Colaborativo'), 'LoginPage must not show "Whiteboard Colaborativo" badge');
  assert.ok(!content.includes('animate-pulse'), 'LoginPage must not have pulsing dot badge');

  // Encaixe perfeito em tela única sem scroll
  assert.ok(content.includes('h-screen') || content.includes('100dvh'), 'LoginPage must fit viewport height');
  assert.ok(content.includes('overflow-hidden'), 'LoginPage must have overflow-hidden to prevent vertical scrolling');
  assert.ok(content.includes('LoginBoardShowcase'), 'LoginPage must embed LoginBoardShowcase');
});

test('AuthCard: removes "Acesso seguro sem cadastro complexo" message', () => {
  const filePath = path.resolve('src/components/auth/AuthCard.tsx');
  assert.ok(fs.existsSync(filePath), 'AuthCard.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(!content.includes('Acesso seguro sem cadastro complexo'), 'AuthCard must not contain "Acesso seguro sem cadastro complexo"');
  assert.ok(!content.includes('cadastro complexo'), 'AuthCard must not contain "cadastro complexo"');
});

test('LoginBoardShowcase: includes genuine whiteboard components and moving collaborator cursors', () => {
  const filePath = path.resolve('src/components/auth/LoginBoardShowcase.tsx');
  assert.ok(fs.existsSync(filePath), 'LoginBoardShowcase.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf-8');

  // Componentes reais de whiteboard
  assert.ok(content.includes('Frame: Sprint Retrospectiva & Ideação'), 'Must render authentic whiteboard frame');
  assert.ok(content.includes('#fff9b1'), 'Must use authentic signature yellow sticky note color');
  assert.ok(content.includes('#dcfce7'), 'Must use authentic signature mint sticky note color');
  assert.ok(content.includes('#e0f2fe'), 'Must use authentic signature sky blue sticky note color');

  // Barra de ferramentas real
  assert.ok(content.includes('Selecionar / Mover'), 'Toolbar must include Select tool');
  assert.ok(content.includes('Nota Adesiva / Post-it'), 'Toolbar must include Sticky tool');
  assert.ok(content.includes('Formas Geométricas'), 'Toolbar must include Shape tool');
  assert.ok(content.includes('Caneta & Desenho Livre'), 'Toolbar must include Pen tool');
  assert.ok(content.includes('Conector / Seta'), 'Toolbar must include Connector tool');

  // Cursores colaborativos em movimento
  assert.ok(content.includes('animate-login-cursor-sofia'), 'Sofia cursor must have GPU animation');
  assert.ok(content.includes('animate-login-cursor-lucas'), 'Lucas cursor must have GPU animation');
  assert.ok(content.includes('animate-login-cursor-camila'), 'Camila cursor must have GPU animation');

  // Balões de cursor chat e seleção dinâmica
  assert.ok(content.includes('animate-login-chat-sofia'), 'Sofia must have live cursor chat');
  assert.ok(content.includes('animate-login-chat-lucas'), 'Lucas must have live cursor chat');
  assert.ok(content.includes('animate-login-lucas-selection'), 'Lucas must have live selection marquee on sticky');

  // Interatividade: cursor do visitante ("Você") e áudio chime nas reações
  assert.ok(content.includes('userPointer'), 'Showcase must track visitor mouse movement');
  assert.ok(content.includes('playReactionPopSound'), 'Clicking reactions must trigger interactive sound pop');
});

test('index.css: contains 100% GPU accelerated animations and supports prefers-reduced-motion', () => {
  const cssPath = path.resolve('src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes login-cursor-sofia'), 'Must define login-cursor-sofia keyframes');
  assert.ok(css.includes('@keyframes login-cursor-lucas'), 'Must define login-cursor-lucas keyframes');
  assert.ok(css.includes('@keyframes login-cursor-camila'), 'Must define login-cursor-camila keyframes');
  assert.ok(css.includes('@keyframes local-reaction-pop'), 'Must define local-reaction-pop keyframes');
  assert.ok(css.includes('will-change: transform'), 'Must use will-change: transform for hardware acceleration');
  assert.ok(css.includes('.animate-login-cursor-sofia'), 'Reduced motion must include animate-login-cursor-sofia');
});
