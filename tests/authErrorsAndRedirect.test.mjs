import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatAuthError, isMobileOrInAppBrowser } from '../src/utils/authErrors.ts';

test('formatAuthError: properly formats popup-blocked to informative friendly message', () => {
  const error = { code: 'auth/popup-blocked', message: 'Firebase: Error (auth/popup-blocked).' };
  const formatted = formatAuthError(error);
  assert.ok(formatted.includes('bloqueou o pop-up'), 'Must explain that popup was blocked');
  assert.ok(formatted.includes('Redirecionando'), 'Must inform user that redirection is taking place');
  assert.ok(!formatted.includes('Firebase: Error'), 'Must not leak ugly raw Firebase error code');
});

test('formatAuthError: silences voluntary popup close without showing aggressive error banner', () => {
  const closedByUser = { code: 'auth/popup-closed-by-user', message: 'Popup closed' };
  const cancelledRequest = { code: 'auth/cancelled-popup-request', message: 'Cancelled request' };

  assert.equal(formatAuthError(closedByUser), '', 'Closing popup voluntarily must not show error');
  assert.equal(formatAuthError(cancelledRequest), '', 'Cancelled popup request must not show error');
});

test('formatAuthError: formats network and configuration errors cleanly', () => {
  const networkError = { code: 'auth/network-request-failed' };
  assert.ok(formatAuthError(networkError).includes('rede'));

  const unauthorizedDomain = { code: 'auth/unauthorized-domain' };
  assert.ok(formatAuthError(unauthorizedDomain).includes('domínio não está autorizado'));

  const unknownRawError = { message: 'Firebase: Error (auth/some-weird-internal-error).' };
  assert.ok(!formatAuthError(unknownRawError).includes('Firebase: Error'));
});

test('isMobileOrInAppBrowser: detects common in-app social browsers where popups fail', () => {
  // Instagram in-app browser UA
  const instagramUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0';
  assert.equal(isMobileOrInAppBrowser(instagramUA, 0), true, 'Instagram in-app must be detected');

  // Facebook in-app browser UA
  const fbUA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Mobile Safari/537.36 [FBAN/EMA;FBAV/385.0.0.12]';
  assert.equal(isMobileOrInAppBrowser(fbUA, 0), true, 'Facebook in-app must be detected');

  // WhatsApp UA
  const whatsappUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WhatsApp/2.23.10.77';
  assert.equal(isMobileOrInAppBrowser(whatsappUA, 0), true, 'WhatsApp in-app must be detected');
});

test('isMobileOrInAppBrowser: detects mobile phones & tablets', () => {
  const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  assert.equal(isMobileOrInAppBrowser(iphoneUA, 0), true, 'iPhone Safari must be detected as mobile');

  const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  assert.equal(isMobileOrInAppBrowser(androidUA, 0), true, 'Android Chrome must be detected as mobile');

  // iPad on iPadOS (reports as Macintosh with touch points)
  const ipadUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15';
  assert.equal(isMobileOrInAppBrowser(ipadUA, 5), true, 'iPad with touch points must be detected');
});

test('isMobileOrInAppBrowser: returns false for standard desktop browsers', () => {
  const desktopChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  assert.equal(isMobileOrInAppBrowser(desktopChrome, 0), false, 'Desktop Windows Chrome is not mobile');

  const macSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  assert.equal(isMobileOrInAppBrowser(macSafari, 0), false, 'Desktop Mac Safari without touch points is not mobile');
});

test('AuthContext.tsx handles popup-blocked with automatic signInWithRedirect fallback and getRedirectResult', () => {
  const authContextPath = path.resolve('src/context/AuthContext.tsx');
  const content = fs.readFileSync(authContextPath, 'utf-8');

  assert.ok(content.includes('signInWithRedirect'), 'AuthContext must import and use signInWithRedirect');
  assert.ok(content.includes('getRedirectResult'), 'AuthContext must import and process getRedirectResult');
  assert.ok(content.includes('auth/popup-blocked'), 'AuthContext must catch auth/popup-blocked error');
  assert.ok(content.includes('signInWithRedirect(auth, googleProvider)'), 'AuthContext must fallback to signInWithRedirect when popup is blocked');
});

test('Cross-page OAuth redirect preserves destination via sessionStorage', () => {
  const loginPagePath = path.resolve('src/pages/LoginPage.tsx');
  const loginContent = fs.readFileSync(loginPagePath, 'utf-8');
  assert.ok(loginContent.includes('mirio_auth_redirect'), 'LoginPage must save and retrieve redirect destination');

  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  assert.ok(appContent.includes('mirio_auth_redirect'), 'App.tsx must honor mirio_auth_redirect from sessionStorage upon return');
});
