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
  assert.ok(!content.includes('animate-spin rounded-full'), 'Should NOT use legacy circular progress');
});

test('LoadingScreen CSS: contains Emil Kowalski GPU animations and prefers-reduced-motion', () => {
  const cssPath = path.resolve('src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('@keyframes mirio-beam'), 'Keyframe mirio-beam must be defined');
  assert.ok(css.includes('@keyframes mirio-loader-entrance'), 'Keyframe mirio-loader-entrance must be defined');
  assert.ok(css.includes('.animate-mirio-beam'), 'Class animate-mirio-beam must be defined');
  assert.ok(css.includes('.animate-mirio-entrance'), 'Class animate-mirio-entrance must be defined');
  assert.ok(css.includes('cubic-bezier(0.23, 1, 0.32, 1)'), 'Must use custom organic easing curve');
  assert.ok(css.includes('prefers-reduced-motion'), 'Must support reduced motion for accessibility');
});

test('index.html: contains zero-FOUC initial loader matching design system', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  assert.ok(html.includes('id="initial-loader"'), 'index.html must have initial fallback loader');
  assert.ok(html.includes('init-beam'), 'index.html fallback must use precision laser rail');
  assert.ok(html.includes('init-dots'), 'index.html must include canvas dots background');
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
  assert.ok(boardContent.includes('<Navigate to={`/login?redirect='), 'BoardPage must redirect unauthenticated users to global login');
  assert.ok(!boardContent.includes('<AuthCard'), 'BoardPage must not render a duplicate inline AuthCard');
});

