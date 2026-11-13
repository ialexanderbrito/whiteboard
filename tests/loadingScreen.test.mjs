import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('LoadingScreen: component exists and exports LoadingScreen and PageLoader', () => {
  const filePath = path.resolve('src/components/layout/LoadingScreen.tsx');
  assert.ok(fs.existsSync(filePath), 'LoadingScreen.tsx should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('export const LoadingScreen'), 'Should export LoadingScreen');
  assert.ok(content.includes('export const PageLoader'), 'Should export PageLoader');
  assert.ok(content.includes('animate-mirio-beam'), 'Should use modern laser beam progress rail');
  assert.ok(content.includes('animate-mirio-entrance'), 'Should use Emil Kowalski entrance physics');
  assert.ok(content.includes('LoadingCollaboratorCursors'), 'Should include animated collaborator cursors');
  assert.ok(!content.includes('animate-spin rounded-full'), 'Should NOT use legacy circular progress');
});

test('LoadingCollaboratorCursors: renders all 5 simulated live collaborators and actions', () => {
  const filePath = path.resolve('src/components/layout/LoadingCollaboratorCursors.tsx');
  assert.ok(fs.existsSync(filePath), 'LoadingCollaboratorCursors.tsx should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('Sofia'), 'Should include collaborator Sofia');
  assert.ok(content.includes('Lucas'), 'Should include collaborator Lucas');
  assert.ok(content.includes('Mateo'), 'Should include collaborator Mateo');
  assert.ok(content.includes('Camila'), 'Should include collaborator Camila');
  assert.ok(content.includes('Gabriel'), 'Should include collaborator Gabriel');

  assert.ok(content.includes('animate-mirio-cursor-sofia'), 'Sofia cursor should have GPU physics');
  assert.ok(content.includes('animate-mirio-sticky-drag'), 'Sticky note should follow Sofia drag');
  assert.ok(content.includes('animate-mirio-cursor-lucas'), 'Lucas cursor should have selection motion');
  assert.ok(content.includes('animate-mirio-lucas-chat'), 'Lucas should have cursor chat bubble');
  assert.ok(content.includes('animate-mirio-cursor-mateo'), 'Mateo cursor should position priority sticker');
  assert.ok(content.includes('animate-mirio-cursor-camila'), 'Camila cursor should connect flow nodes');
  assert.ok(content.includes('animate-mirio-cursor-gabriel'), 'Gabriel cursor should have real-time chat bubble');
  assert.ok(content.includes('pointer-events-none'), 'All mock cursors must be non-blocking for interaction');
});

test('LoadingScreen CSS: contains Emil Kowalski GPU animations, fluid beam, and prefers-reduced-motion', () => {
  const cssPath = path.resolve('src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes mirio-beam'), 'Keyframe mirio-beam must be defined');
  assert.ok(css.includes('@keyframes mirio-loader-entrance'), 'Keyframe mirio-loader-entrance must be defined');
  assert.ok(css.includes('.animate-mirio-beam'), 'Class animate-mirio-beam must be defined');
  assert.ok(css.includes('.animate-mirio-entrance'), 'Class animate-mirio-entrance must be defined');
  assert.ok(css.includes('cubic-bezier(0.23, 1, 0.32, 1)'), 'Must use custom organic easing curve');
  assert.ok(css.includes('translateX(220%)'), 'Beam must fully exit track past 200% to eliminate snapping jumps');
  assert.ok(!css.includes('translateY(6px)'), 'Loader entrance must not have vertical jump');

  assert.ok(css.includes('animate-mirio-cursor-sofia'), 'Sofia cursor class must be defined');
  assert.ok(css.includes('animate-mirio-cursor-lucas'), 'Lucas cursor class must be defined');
  assert.ok(css.includes('animate-mirio-cursor-mateo'), 'Mateo cursor class must be defined');
  assert.ok(css.includes('animate-mirio-cursor-camila'), 'Camila cursor class must be defined');
  assert.ok(css.includes('animate-mirio-cursor-gabriel'), 'Gabriel cursor class must be defined');
  assert.ok(css.includes('prefers-reduced-motion'), 'Must support reduced motion for accessibility');
});

test('index.html: contains zero-FOUC initial loader with matching collaborator cursors', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  assert.ok(html.includes('id="initial-loader"'), 'index.html must have initial fallback loader');
  assert.ok(html.includes('init-beam'), 'index.html fallback must use precision laser rail');
  assert.ok(html.includes('init-dots'), 'index.html must include canvas dots background');
  assert.ok(html.includes('translateX(220%)'), 'Fallback beam must fully exit without snapping');
  assert.ok(html.includes('init-cursors'), 'index.html must have collaborative cursors from initial HTML render (no loader without cursors)');
  assert.ok(html.includes('Sofia'), 'index.html must include collaborator Sofia');
  assert.ok(html.includes('Lucas'), 'index.html must include collaborator Lucas');
  assert.ok(html.includes('Mateo'), 'index.html must include collaborator Mateo');
  assert.ok(html.includes('Camila'), 'index.html must include collaborator Camila');
  assert.ok(html.includes('Gabriel'), 'index.html must include collaborator Gabriel');
});

test('App.tsx and BoardPage.tsx: circular progress spinner replaced with LoadingScreen', () => {
  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  assert.ok(appContent.includes('LoadingScreen'), 'App.tsx must use LoadingScreen');
  assert.ok(!appContent.includes('animate-spin rounded-full h-8 w-8 border-b-2'), 'App.tsx must not use old circular spinner');

  const boardPath = path.resolve('src/pages/BoardPage.tsx');
  const boardContent = fs.readFileSync(boardPath, 'utf-8');
  assert.ok(boardContent.includes('LoadingScreen'), 'BoardPage.tsx must use LoadingScreen');
  assert.ok(!boardContent.includes('animate-spin rounded-full h-10 w-10 border-b-2'), 'BoardPage.tsx must not use authLoading circular spinner');
  assert.ok(!boardContent.includes('animate-spin rounded-full h-8 w-8 border-b-2'), 'BoardPage.tsx must not use boardLoading circular spinner');
});

test('Single Global Login: LoginPage is minimal and BoardPage redirects unauthenticated users', () => {
  const loginPath = path.resolve('src/pages/LoginPage.tsx');
  const loginContent = fs.readFileSync(loginPath, 'utf-8');
  assert.ok(loginContent.includes('useSearchParams'), 'LoginPage must support redirect query param');
  assert.ok(loginContent.includes('redirectUrl'), 'LoginPage must redirect to requested board or home');
  assert.ok(!loginContent.includes('01 // SPRINT_PLAN'), 'LoginPage must not have bulky marketing stage');

  const boardPath = path.resolve('src/pages/BoardPage.tsx');
  const boardContent = fs.readFileSync(boardPath, 'utf-8');
  assert.ok(boardContent.includes('<Navigate to={`/invite/'), 'BoardPage must redirect unauthenticated users to the dedicated invite screen');
  assert.ok(!boardContent.includes('<AuthCard'), 'BoardPage must not render a duplicate inline AuthCard');
});
