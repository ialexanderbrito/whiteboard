import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('StickyNoteItem: reaction pills are docked on bottom border (Miro-style) without stealing text space', () => {
  const stickyPath = path.resolve('src/components/whiteboard/StickyNoteItem.tsx');
  const content = fs.readFileSync(stickyPath, 'utf-8');

  // Must dock badges half-inside / half-outside the bottom border
  assert.ok(
    content.includes('y: Math.round(height - BADGE_HEIGHT / 2)'),
    'Reaction badges must be docked overlapping the bottom border (height - BADGE_HEIGHT / 2)'
  );

  // Must liberate text height: footerReserveHeight only accounts for author, not 38px badge cut
  assert.ok(
    content.includes('const footerReserveHeight = element.updatedByName ? 18 : 12;'),
    'Text max height must not be severely clipped by badges'
  );

  // Author must sit in bottom right corner
  assert.ok(
    content.includes('x={width - 86}') && content.includes('y={height - 16}'),
    'Author must be positioned in the bottom right corner inside the sticky'
  );

  // Badges must have authentic Miro-style pill shape (cornerRadius: 11 for 22px height)
  assert.ok(
    content.includes('cornerRadius={11}'),
    'Reaction badges must use full pill cornerRadius 11'
  );

  // Must render subtle '+' button on hover when note has no reactions
  assert.ok(
    content.includes('!hasReactions && isHoveredLocal && canEdit'),
    'Must render subtle mini "+" button under hover when note has no reactions'
  );

  // Must include '+' button at the end of the active reactions row
  assert.ok(
    content.includes('footerBadgesLayout.plusButtonX !== null'),
    'Must include integrated "+" button at the end of the badge row'
  );
});

test('StickyReactionBar: origin-aware positioning opens below the trigger and flips only near viewport bottom', () => {
  const reactionBarPath = path.resolve('src/components/whiteboard/StickyReactionBar.tsx');
  const content = fs.readFileSync(reactionBarPath, 'utf-8');

  // Must calculate whether there is space below the trigger
  assert.ok(
    content.includes('hasSpaceBelow = screenY + popoverHeight + 16 <= viewportHeight'),
    'StickyReactionBar must check viewport height to know if it can open downwards'
  );

  // Must place below by default (+12), or above (-10) when flipping
  assert.ok(
    content.includes('finalY = placeAbove ? screenY - 10 : screenY + 12'),
    'StickyReactionBar must open below the trigger by default'
  );

  // Must animate with Emil Kowalski ease-out and active scale feedback
  assert.ok(
    content.includes('active:scale-') || content.includes('active:scale['),
    'Emoji buttons must have tactile active press scale'
  );
});

test('WhiteboardCanvas: eliminates intrusive StickyInternalReactions overlay, avoiding QuickAdd collision', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const content = fs.readFileSync(canvasPath, 'utf-8');

  // StickyInternalReactions must NOT be rendered in canvas
  assert.ok(
    !content.includes('<StickyInternalReactions'),
    'WhiteboardCanvas must not render StickyInternalReactions overlay'
  );

  // Must not store hoveredStickyId state causing whole-canvas re-renders on hover
  assert.ok(
    !content.includes('hoveredStickyId'),
    'WhiteboardCanvas must not re-render the entire canvas on sticky hover'
  );

  // StickyReactionBar must still be wired to reactionPickerSticky
  assert.ok(
    content.includes('<StickyReactionBar'),
    'WhiteboardCanvas must wire StickyReactionBar popover for reaction picker'
  );
});
