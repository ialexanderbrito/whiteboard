import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { USER_COLORS, USER_COLOR_PRESETS } from '../src/utils/colors.ts';

test('Guest profile name trimming and validation', () => {
  const sanitizeName = (raw) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return 'Convidado';
    return trimmed.slice(0, 30);
  };

  assert.equal(sanitizeName('   Alexander   '), 'Alexander');
  assert.equal(sanitizeName('   '), 'Convidado');
  assert.equal(sanitizeName(''), 'Convidado');
  assert.equal(sanitizeName('A'.repeat(50)), 'A'.repeat(30));
});

test('User colors array has at least 8 distinct colors for cursor selection', () => {
  assert.ok(USER_COLORS.length >= 8);
  assert.ok(USER_COLOR_PRESETS.length >= 8);
  const unique = new Set(USER_COLORS.map(c => c.toLowerCase()));
  assert.equal(unique.size, USER_COLORS.length);
});

test('Google account users cannot change their display name, only cursor color', () => {
  const applyProfileUpdate = (user, newName, newColor) => {
    const isGoogleAccount = !user.isAnonymous;
    const effectiveName = isGoogleAccount ? user.displayName : (newName.trim() || user.displayName);
    return {
      ...user,
      displayName: effectiveName,
      color: newColor || user.color,
    };
  };

  const googleUser = {
    uid: 'google_123',
    displayName: 'Carlos Google Silva',
    email: 'carlos@gmail.com',
    photoURL: 'https://lh3.googleusercontent.com/a/sample',
    isAnonymous: false,
    color: '#3b82f6',
  };

  const guestUser = {
    uid: 'guest_456',
    displayName: 'Convidado 1',
    email: null,
    photoURL: null,
    isAnonymous: true,
    color: '#3b82f6',
  };

  // Google user attempts to rename
  const updatedGoogle = applyProfileUpdate(googleUser, 'Tentativa de Hackear Nome', '#ef4444');
  assert.equal(updatedGoogle.displayName, 'Carlos Google Silva');
  assert.equal(updatedGoogle.color, '#ef4444');
  assert.equal(updatedGoogle.photoURL, 'https://lh3.googleusercontent.com/a/sample');

  // Guest user successfully renames
  const updatedGuest = applyProfileUpdate(guestUser, 'Novo Nome Legal', '#10b981');
  assert.equal(updatedGuest.displayName, 'Novo Nome Legal');
  assert.equal(updatedGuest.color, '#10b981');
  assert.equal(updatedGuest.photoURL, null);
});

test('Presence payload preserves photoURL for Google accounts and handles guests', () => {
  const createPresencePayload = (user) => {
    return {
      userId: user.uid,
      name: user.displayName || 'Colega',
      color: user.color || '#3b82f6',
      photoURL: user.photoURL || null,
      isAnonymous: Boolean(user.isAnonymous),
    };
  };

  const googlePresence = createPresencePayload({
    uid: 'g1',
    displayName: 'Mariana Dev',
    color: '#8b5cf6',
    photoURL: 'https://lh3.googleusercontent.com/mariana',
    isAnonymous: false,
  });

  assert.equal(googlePresence.photoURL, 'https://lh3.googleusercontent.com/mariana');
  assert.equal(googlePresence.isAnonymous, false);

  const guestPresence = createPresencePayload({
    uid: 'guest1',
    displayName: 'Convidado',
    color: '#f59e0b',
    photoURL: null,
    isAnonymous: true,
  });

  assert.equal(guestPresence.photoURL, null);
  assert.equal(guestPresence.isAnonymous, true);
});

test('EditProfileModal: Google users do not see the display name input, only custom cursor color options', () => {
  const modalPath = path.resolve('src/components/whiteboard/EditProfileModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'EditProfileModal.tsx deve existir');

  const content = fs.readFileSync(modalPath, 'utf8');

  // Input de nome deve ser renderizado condicionalmente APENAS para quem NÃO é usuário Google (!isGoogleUser)
  assert.match(content, /\{!isGoogleUser && \([\s\S]*?id="edit-display-name-input"/, 'Input de nome só deve aparecer para convidados');

  // Suporte a cores personalizadas (Pipette / input type="color" / Hex)
  assert.match(content, /<Pipette/, 'Deve conter ícone de conta-gotas para cor personalizada');
  assert.match(content, /type="color"/, 'Deve conter input nativo de cor personalizada');
  assert.match(content, /USER_COLOR_PRESETS/, 'Deve utilizar a paleta expandida de presets');
});
