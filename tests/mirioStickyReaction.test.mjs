import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('mirioReaction utils: exports Firestore-safe reaction constants and functions', () => {
  const utilsPath = path.resolve('src/utils/mirioReaction.ts');
  const content = fs.readFileSync(utilsPath, 'utf-8');

  // Must not use __mirio_original__ as active constant because Firestore forbids __.*__ field paths
  assert.match(content, /export const MIRIO_REACTION = 'mirio_original';/);
  assert.match(content, /export const isMirioReaction/);
  assert.match(content, /export const getReactionImageUrl/);
  assert.match(content, /export const loadMirioReactionImage/);
  assert.match(content, /export const getCachedMirioReactionImage/);

  // Must still support legacy __mirio_original__ for backwards compatibility
  assert.match(content, /__mirio_original__/);
});

test('StickyNoteItem: renders custom KonvaImage badge for everyone, but locks interaction for non-unlocked users', () => {
  const stickyItemPath = path.resolve('src/components/whiteboard/StickyNoteItem.tsx');
  const content = fs.readFileSync(stickyItemPath, 'utf-8');

  // Must import isMirioReaction and KonvaImage
  assert.ok(
    content.includes('isMirioReaction'),
    'StickyNoteItem must import and use isMirioReaction'
  );
  assert.ok(
    content.includes('Image as KonvaImage'),
    'StickyNoteItem must import KonvaImage for rendering custom reaction image'
  );

  // Must render KonvaImage for mirioImage and text for countStr
  assert.ok(
    content.includes('<KonvaImage'),
    'StickyNoteItem must render KonvaImage for Mirio custom reaction'
  );

  // Must calculate dynamic badge layout with cumulative x coordinates
  assert.ok(
    content.includes('reactionBadges'),
    'StickyNoteItem must pre-calculate reactionBadges layout with cumulative x coordinates'
  );

  // Non-unlocked users can only view: clicking does nothing and cursor stays default
  assert.ok(
    content.includes('if (isLocked) return;'),
    'StickyNoteItem must prevent locked users from reacting via the sticky badge'
  );
  assert.ok(
    content.includes("isLocked ? 'default' : 'pointer'"),
    'StickyNoteItem must set default cursor when hovering locked reaction'
  );
});

test('StickyReactionBar & FacilitationMenu: keep Mirio reaction hidden for non-unlocked users', () => {
  const reactionBarPath = path.resolve('src/components/whiteboard/StickyReactionBar.tsx');
  const barContent = fs.readFileSync(reactionBarPath, 'utf-8');

  // Must conditionally show MIRIO_REACTION only when unlocked
  assert.ok(
    barContent.includes('mirioReactionUnlocked ? [MIRIO_REACTION] : []'),
    'StickyReactionBar must hide Mirio reaction for users who did not unlock the easter egg'
  );

  const facilitationPath = path.resolve('src/components/whiteboard/FacilitationMenu.tsx');
  const facContent = fs.readFileSync(facilitationPath, 'utf-8');

  assert.ok(
    facContent.includes('mirioReactionUnlocked ? [{ emoji: MIRIO_REACTION, label: \'Mirio\' }] : []'),
    'FacilitationMenu must hide Mirio reaction for users who did not unlock the easter egg'
  );
});

test('WhiteboardCanvas & BoardPage: block reaction attempt if locked and synchronize valid Firestore field names', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(
    canvasContent.includes('isMirioReaction(emoji) && !mirioReactionUnlocked'),
    'WhiteboardCanvas must guard against unauthorized reaction attempts'
  );

  const boardPagePath = path.resolve('src/pages/BoardPage.tsx');
  const boardPageContent = fs.readFileSync(boardPagePath, 'utf-8');

  assert.ok(
    boardPageContent.includes('isMirioReaction(emoji) && !mirioReactionUnlocked'),
    'BoardPage must guard against unauthorized reaction attempts'
  );
  assert.ok(
    boardPageContent.includes("reactions['__mirio_original__']"),
    'BoardPage must sanitize legacy double-underscore key so Firestore document writes succeed'
  );
});

test('Whiteboard shortcuts: image modal uses U and letters M, I, R, O never open modals', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  // Shortcut for opening stickers/images modal must NOT be I or i
  assert.doesNotMatch(
    canvasContent,
    /key === ['"]i['"]\s*\|\|\s*e\.key === ['"]I['"][\s\S]*?onOpenStickers/,
    'Shortcut I must not open stickers modal'
  );

  // Shortcut for opening stickers/images modal must be U / u
  assert.match(
    canvasContent,
    /\(e\.key === ['"]u['"]\s*\|\|\s*e\.key === ['"]U['"]\)\s*&&\s*onOpenStickers/,
    'Shortcut U must open stickers modal'
  );

  // Letters M, I, R, O must not trigger onOpenStickers or open any modal
  const mirioLetters = ['m', 'M', 'i', 'I', 'r', 'R', 'o', 'O'];
  for (const letter of mirioLetters) {
    const modalTriggerRegex = new RegExp(
      `e\\.key === ['"]${letter}['"][\\s\\S]{0,60}onOpen(Stickers|Shortcuts|Templates|Modal)`
    );
    assert.doesNotMatch(
      canvasContent,
      modalTriggerRegex,
      `Letter ${letter} must never open a modal`
    );
  }

  // Check UI references: KeyboardShortcutsModal, Toolbar, BoardContextMenu, CommandPalette
  const shortcutsModalContent = fs.readFileSync(path.resolve('src/components/whiteboard/KeyboardShortcutsModal.tsx'), 'utf-8');
  assert.match(shortcutsModalContent, /keys:\s*\['U'\][\s\S]*?Stickers/);
  assert.doesNotMatch(shortcutsModalContent, /keys:\s*\['I'\][\s\S]*?Stickers/);

  const toolbarContent = fs.readFileSync(path.resolve('src/components/whiteboard/Toolbar.tsx'), 'utf-8');
  assert.match(toolbarContent, /Imagens, Stickers & GIFs[\s\S]*?\(U\)/);
  assert.doesNotMatch(toolbarContent, /Imagens, Stickers & GIFs[\s\S]*?\(I\)/);

  const contextMenuContent = fs.readFileSync(path.resolve('src/components/whiteboard/BoardContextMenu.tsx'), 'utf-8');
  assert.match(contextMenuContent, /Imagens, Stickers & Emojis\.\.\.[\s\S]*?<kbd[^>]*>\s*U\s*<\/kbd>/);

  const commandPaletteContent = fs.readFileSync(path.resolve('src/components/command/CommandPalette.tsx'), 'utf-8');
  assert.match(commandPaletteContent, /Imagens do Computador, Stickers, Emojis & GIFs[\s\S]*?<kbd[^>]*>U<\/kbd>/);
});
