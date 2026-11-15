import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ditadorEasterEgg utils: exports Firestore-safe reaction constants and functions', () => {
  const utilsPath = path.resolve('src/utils/mirioReaction.ts');
  const content = fs.readFileSync(utilsPath, 'utf-8');

  // Must not use __ditador_original__ as active constant because Firestore forbids __.*__ field paths
  assert.match(content, /export const DITADOR_REACTION = 'ditador_original';/);
  assert.match(content, /export const DITADOR_REACTION_UNLOCK_KEY = 'ditador_original_reaction_unlocked';/);
  assert.match(content, /export const isDitadorReaction/);
  assert.match(content, /export const loadDitadorReactionImage/);
  assert.match(content, /export const getCachedDitadorReactionImage/);
  assert.match(content, /export const isDitadorReactionUnlocked/);
  assert.match(content, /export const unlockDitadorReaction/);

  // Must still support legacy __ditador_original__ for backwards compatibility
  assert.match(content, /__ditador_original__/);

  // Must return ditador asset url in getReactionImageUrl
  assert.match(content, /isDitadorReaction\(reaction\)\)\s*return\s*ditadorOriginalUrl/);
});

test('StickyNoteItem & ElementReactionBadges: support ditador easter egg alongside mirio', () => {
  const stickyItemPath = path.resolve('src/components/whiteboard/StickyNoteItem.tsx');
  const stickyContent = fs.readFileSync(stickyItemPath, 'utf-8');

  assert.ok(stickyContent.includes('isDitadorReaction'), 'StickyNoteItem must import and use isDitadorReaction');
  assert.ok(stickyContent.includes('ditadorReactionUnlocked'), 'StickyNoteItem must accept ditadorReactionUnlocked prop');
  assert.ok(stickyContent.includes('getCachedDitadorReactionImage'), 'StickyNoteItem must use getCachedDitadorReactionImage');

  const badgesPath = path.resolve('src/components/whiteboard/ElementReactionBadges.tsx');
  const badgesContent = fs.readFileSync(badgesPath, 'utf-8');

  assert.ok(badgesContent.includes('isDitadorReaction'), 'ElementReactionBadges must import and use isDitadorReaction');
  assert.ok(badgesContent.includes('ditadorReactionUnlocked'), 'ElementReactionBadges must accept ditadorReactionUnlocked prop');
  assert.ok(badgesContent.includes('getCachedDitadorReactionImage'), 'ElementReactionBadges must use getCachedDitadorReactionImage');
});

test('StickyReactionBar & FacilitationMenu: keep Ditador reaction hidden for non-unlocked users', () => {
  const reactionBarPath = path.resolve('src/components/whiteboard/StickyReactionBar.tsx');
  const barContent = fs.readFileSync(reactionBarPath, 'utf-8');

  assert.ok(
    barContent.includes('ditadorReactionUnlocked ? [DITADOR_REACTION] : []'),
    'StickyReactionBar must hide Ditador reaction for users who did not unlock the easter egg'
  );

  const facilitationPath = path.resolve('src/components/whiteboard/FacilitationMenu.tsx');
  const facContent = fs.readFileSync(facilitationPath, 'utf-8');

  assert.ok(
    facContent.includes("ditadorReactionUnlocked ? [{ emoji: DITADOR_REACTION, label: 'Ditador' }] : []"),
    'FacilitationMenu must hide Ditador reaction for users who did not unlock the easter egg'
  );
});

test('WhiteboardCanvas & BoardPage: block reaction attempt if locked, sanitize legacy keys and unlock on typing ditador', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(
    canvasContent.includes('isDitadorReaction(emoji) && !ditadorReactionUnlocked'),
    'WhiteboardCanvas must guard against unauthorized Ditador reaction attempts'
  );
  assert.ok(
    canvasContent.includes("reactions['__ditador_original__']"),
    'WhiteboardCanvas must sanitize legacy double-underscore key for ditador'
  );

  const boardPagePath = path.resolve('src/pages/BoardPage.tsx');
  const boardPageContent = fs.readFileSync(boardPagePath, 'utf-8');

  assert.ok(
    boardPageContent.includes('isDitadorReaction(emoji) && !ditadorReactionUnlocked'),
    'BoardPage must guard against unauthorized Ditador reaction attempts'
  );
  assert.ok(
    boardPageContent.includes("reactions['__ditador_original__']"),
    'BoardPage must sanitize legacy double-underscore key so Firestore document writes succeed'
  );

  // Secret unlock keyword 'ditador'
  assert.ok(
    boardPageContent.includes("keyBuffer.slice(-7).join('') === 'ditador'"),
    'BoardPage must check for secret word ditador in keyBuffer'
  );
  assert.ok(
    boardPageContent.includes('unlockDitadorReaction()'),
    'BoardPage must call unlockDitadorReaction when secret word is typed'
  );
  assert.ok(
    boardPageContent.includes('ditador-reaction-unlocked'),
    'BoardPage must listen to ditador-reaction-unlocked event'
  );
});

test('GlobalReactionsOverlay: preloads and renders Ditador reaction image', () => {
  const overlayPath = path.resolve('src/components/whiteboard/GlobalReactionsOverlay.tsx');
  const overlayContent = fs.readFileSync(overlayPath, 'utf-8');

  assert.ok(
    overlayContent.includes('DITADOR_REACTION'),
    'GlobalReactionsOverlay must import DITADOR_REACTION'
  );
  assert.ok(
    overlayContent.includes('getReactionImageUrl(DITADOR_REACTION)'),
    'GlobalReactionsOverlay must preload Ditador reaction image'
  );
});
