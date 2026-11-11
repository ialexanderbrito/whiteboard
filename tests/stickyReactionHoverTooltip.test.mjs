import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatReactionVotersText } from '../src/utils/reactionTooltip.ts';

test('formatReactionVotersText: single user (Você) generates singular verb and prioritizes Você', () => {
  const resolve = (id) => (id === 'user-1' ? 'Mariana' : 'Participante');
  const result = formatReactionVotersText(['user-curr'], 'user-curr', resolve, '👍');

  assert.ok(result);
  assert.deepEqual(result.names, ['Você']);
  assert.equal(result.verb, 'reagiu com');
  assert.equal(result.emoji, '👍');
  assert.equal(result.isMirio, false);
});

test('formatReactionVotersText: single other user generates singular verb', () => {
  const resolve = (id) => (id === 'user-1' ? 'Mariana' : 'Participante');
  const result = formatReactionVotersText(['user-1'], 'user-curr', resolve, '🔥');

  assert.ok(result);
  assert.deepEqual(result.names, ['Mariana']);
  assert.equal(result.verb, 'reagiu com');
  assert.equal(result.emoji, '🔥');
});

test('formatReactionVotersText: two users generate plural verb and put Você first', () => {
  const resolve = (id) => (id === 'user-1' ? 'Mariana' : 'Participante');
  const result = formatReactionVotersText(['user-1', 'user-curr'], 'user-curr', resolve, '❤️');

  assert.ok(result);
  assert.deepEqual(result.names, ['Você', 'Mariana']);
  assert.equal(result.verb, 'reagiram com');
});

test('formatReactionVotersText: three or more users list all names by full name without abbreviation', () => {
  const usersMap = {
    'user-1': 'Mariana',
    'user-2': 'Pedro',
    'user-3': 'Carlos',
  };
  const resolve = (id) => usersMap[id] || 'Participante';
  const result = formatReactionVotersText(
    ['user-2', 'user-1', 'user-curr', 'user-3'],
    'user-curr',
    resolve,
    '🎉'
  );

  assert.ok(result);
  assert.deepEqual(result.names, ['Você', 'Pedro', 'Mariana', 'Carlos']);
  assert.equal(result.verb, 'reagiram com');
});

test('formatReactionVotersText: supports Mirio custom reaction', () => {
  const resolve = () => 'Pedro';
  const result = formatReactionVotersText(['user-1'], 'user-curr', resolve, 'mirio_original');

  assert.ok(result);
  assert.equal(result.isMirio, true);
  assert.equal(result.emoji, 'mirio_original');
});

test('ReactionBadgeTooltip: component follows Emil Kowalski craft & motion design', () => {
  const tooltipPath = path.resolve('src/components/whiteboard/ReactionBadgeTooltip.tsx');
  const content = fs.readFileSync(tooltipPath, 'utf-8');

  // Custom easing cubic-bezier(0.23, 1, 0.32, 1)
  assert.ok(
    content.includes('cubic-bezier(0.23, 1, 0.32, 1)'),
    'ReactionBadgeTooltip must use Emil Kowalski custom ease-out curve'
  );

  // Animate from scale(0.96) - never scale(0)
  assert.ok(
    content.includes('scale-[0.96]'),
    'ReactionBadgeTooltip must animate from scale(0.96), never scale(0)'
  );

  // Origin-aware placement (origin-top when below, origin-bottom when flipped above)
  assert.ok(
    content.includes("placement === 'above' ? 'origin-bottom' : 'origin-top'"),
    'ReactionBadgeTooltip must be origin-aware based on placement'
  );

  // Subsequent hover performance optimization (no sluggish delay between adjacent badges)
  assert.ok(
    content.includes('SUBSEQUENT_HOVER_WINDOW_MS'),
    'ReactionBadgeTooltip must skip delay on subsequent hovers for perceived performance'
  );

  // Below by default with viewport collision check
  assert.ok(
    content.includes('hasSpaceBelow = screenBottomY + estimatedHeight + 14 <= viewportHeight'),
    'ReactionBadgeTooltip must check space below and open downwards by default'
  );

  // Non-blocking interaction
  assert.ok(
    content.includes('pointer-events-none'),
    'ReactionBadgeTooltip must not intercept clicks or drags on the canvas'
  );
});

test('StickyNoteItem: reaction badge hovers publish and dismiss tooltip cleanly', () => {
  const stickyPath = path.resolve('src/components/whiteboard/StickyNoteItem.tsx');
  const content = fs.readFileSync(stickyPath, 'utf-8');

  assert.ok(
    content.includes('publishReactionTooltip({'),
    'StickyNoteItem must publish tooltip data when hovering a reaction badge'
  );

  assert.ok(
    content.includes('publishReactionTooltip(null)'),
    'StickyNoteItem must dismiss tooltip on mouse leave, drag start or unmount'
  );

  assert.ok(
    content.includes('!isCoarseOrMobileViewport()'),
    'StickyNoteItem must gate hover tooltip behind non-coarse pointer devices'
  );
});

test('WhiteboardCanvas: wires ReactionBadgeTooltip without re-rendering entire canvas', () => {
  const canvasPath = path.resolve('src/components/whiteboard/WhiteboardCanvas.tsx');
  const content = fs.readFileSync(canvasPath, 'utf-8');

  assert.ok(
    content.includes('<ReactionBadgeTooltip'),
    'WhiteboardCanvas must render ReactionBadgeTooltip overlay'
  );

  assert.ok(
    !content.includes('hoveredStickyId'),
    'WhiteboardCanvas must not re-render the entire canvas on sticky hover'
  );

  assert.ok(
    content.includes('resolveUserName'),
    'WhiteboardCanvas must resolve user names for the reaction tooltip'
  );
});
