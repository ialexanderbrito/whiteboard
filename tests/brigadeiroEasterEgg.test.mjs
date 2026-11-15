import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('brigadeiroEasterEgg utils: exports Firestore-safe reaction constants and functions', () => {
  const utilsPath = path.resolve('src/utils/mirioReaction.ts');
  const content = fs.readFileSync(utilsPath, 'utf-8');

  // Must not use __brigadeiro_original__ as active constant because Firestore forbids __.*__ field paths
  assert.match(content, /export const BRIGADEIRO_REACTION = 'brigadeiro_original';/);
  assert.match(content, /export const BRIGADEIRO_REACTION_UNLOCK_KEY = 'brigadeiro_original_reaction_unlocked';/);
  assert.match(content, /export const isBrigadeiroReaction/);
  assert.match(content, /export const loadBrigadeiroReactionImage/);
  assert.match(content, /export const getCachedBrigadeiroReactionImage/);
  assert.match(content, /export const isBrigadeiroReactionUnlocked/);
  assert.match(content, /export const unlockBrigadeiroReaction/);

  // Must still support legacy or alternative keywords for backwards compatibility
  assert.match(content, /__brigadeiro_original__/);
  assert.match(content, /brisadeiro/);

  // Must return brigadeiro asset url in getReactionImageUrl
  assert.match(content, /isBrigadeiroReaction\(reaction\)\)\s*return\s*brigadeiroOriginalUrl/);
});

test('StickyNoteItem & ElementReactionBadges: support brigadeiro easter egg alongside mirio and ditador', () => {
  const stickyItemPath = path.resolve('src/components/whiteboard/StickyNoteItem.tsx');
  const stickyContent = fs.readFileSync(stickyItemPath, 'utf-8');

  assert.ok(stickyContent.includes('isBrigadeiroReaction'), 'StickyNoteItem must import and use isBrigadeiroReaction');
  assert.ok(stickyContent.includes('brigadeiroReactionUnlocked'), 'StickyNoteItem must accept brigadeiroReactionUnlocked prop');
  assert.ok(stickyContent.includes('getCachedBrigadeiroReactionImage'), 'StickyNoteItem must use getCachedBrigadeiroReactionImage');

  const badgesPath = path.resolve('src/components/whiteboard/ElementReactionBadges.tsx');
  const badgesContent = fs.readFileSync(badgesPath, 'utf-8');

  assert.ok(badgesContent.includes('isBrigadeiroReaction'), 'ElementReactionBadges must import and use isBrigadeiroReaction');
  assert.ok(badgesContent.includes('brigadeiroReactionUnlocked'), 'ElementReactionBadges must accept brigadeiroReactionUnlocked prop');
  assert.ok(badgesContent.includes('getCachedBrigadeiroReactionImage'), 'ElementReactionBadges must use getCachedBrigadeiroReactionImage');
});

test('StickyReactionBar & FacilitationMenu: keep Brigadeiro reaction hidden for non-unlocked users', () => {
  const reactionBarPath = path.resolve('src/components/whiteboard/StickyReactionBar.tsx');
  const barContent = fs.readFileSync(reactionBarPath, 'utf-8');

  assert.ok(
    barContent.includes('brigadeiroReactionUnlocked ? [BRIGADEIRO_REACTION] : []'),
    'StickyReactionBar must hide Brigadeiro reaction for users who did not unlock the easter egg'
  );

  const facilitationPath = path.resolve('src/components/whiteboard/FacilitationMenu.tsx');
  const facContent = fs.readFileSync(facilitationPath, 'utf-8');

  assert.ok(
    facContent.includes("brigadeiroReactionUnlocked ? [{ emoji: BRIGADEIRO_REACTION, label: 'Brigadeiro' }] : []"),
    'FacilitationMenu must hide Brigadeiro reaction for users who did not unlock the easter egg'
  );
});

test('WhiteboardCanvas & BoardPage: block reaction attempt if locked, sanitize legacy keys and unlock on typing brigadeiro or brisadeiro', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(
    canvasContent.includes('isBrigadeiroReaction(emoji) && !brigadeiroReactionUnlocked'),
    'WhiteboardCanvas must guard against unauthorized Brigadeiro reaction attempts'
  );
  assert.ok(
    canvasContent.includes("reactions['__brigadeiro_original__']"),
    'WhiteboardCanvas must sanitize legacy double-underscore key for brigadeiro'
  );

  const boardPagePath = path.resolve('src/pages/BoardPage.tsx');
  const boardPageContent = fs.readFileSync(boardPagePath, 'utf-8');

  assert.ok(
    boardPageContent.includes('isBrigadeiroReaction(emoji) && !brigadeiroReactionUnlocked'),
    'BoardPage must guard against unauthorized Brigadeiro reaction attempts'
  );
  assert.ok(
    boardPageContent.includes("reactions['__brigadeiro_original__']"),
    'BoardPage must sanitize legacy double-underscore key so Firestore document writes succeed'
  );

  // Secret unlock keywords 'brigadeiro' and 'brisadeiro'
  assert.ok(
    boardPageContent.includes("'brigadeiro'") && boardPageContent.includes("'brisadeiro'"),
    'BoardPage must check for secret words brigadeiro and brisadeiro in keyBuffer'
  );
  assert.ok(
    boardPageContent.includes('unlockBrigadeiroReaction()'),
    'BoardPage must call unlockBrigadeiroReaction when secret word is typed'
  );
  assert.ok(
    boardPageContent.includes('brigadeiro-reaction-unlocked'),
    'BoardPage must listen to brigadeiro-reaction-unlocked event'
  );
});

test('GlobalReactionsOverlay: preloads and renders Brigadeiro reaction image', () => {
  const overlayPath = path.resolve('src/components/whiteboard/GlobalReactionsOverlay.tsx');
  const overlayContent = fs.readFileSync(overlayPath, 'utf-8');

  assert.ok(
    overlayContent.includes('BRIGADEIRO_REACTION'),
    'GlobalReactionsOverlay must import BRIGADEIRO_REACTION'
  );
  assert.ok(
    overlayContent.includes('getReactionImageUrl(BRIGADEIRO_REACTION)'),
    'GlobalReactionsOverlay must preload Brigadeiro reaction image'
  );
});
