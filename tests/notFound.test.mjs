import test from 'node:test';
import assert from 'node:assert/strict';

function generateBoardId() {
  return Math.random().toString(36).substring(2, 10);
}

test('generateBoardId produces clean alphanumeric IDs without prefix', () => {
  const id1 = generateBoardId();
  const id2 = generateBoardId();

  assert.ok(id1.length >= 6);
  assert.ok(!id1.startsWith('board_'));
  assert.ok(/^[a-z0-9]+$/.test(id1));
  assert.notEqual(id1, id2);
});

function cleanBoardId(rawId) {
  if (typeof rawId !== 'string') return '';
  return rawId.trim().replace(/^board_/, '');
}

test('cleanBoardId handles null, undefined, non-strings and prefixes safely', () => {
  assert.equal(cleanBoardId(undefined), '');
  assert.equal(cleanBoardId(null), '');
  assert.equal(cleanBoardId(12345), '');
  assert.equal(cleanBoardId({}), '');
  assert.equal(cleanBoardId('board_x3nn0emengo'), 'x3nn0emengo');
  assert.equal(cleanBoardId('x3nn0emengo'), 'x3nn0emengo');
  assert.equal(cleanBoardId('  board_abc123  '), 'abc123');
});

test('Clean ID normalization strips legacy board_ prefix consistently', () => {
  const normalizeId = (raw) => (raw || '').replace(/^board_/, '');

  assert.equal(normalizeId('x3nn0emengo'), 'x3nn0emengo');
  assert.equal(normalizeId('board_x3nn0emengo'), 'x3nn0emengo');
  assert.equal(normalizeId('board_12345678'), '12345678');
  assert.equal(normalizeId(''), '');
});

test('Recent visited board list filters out invalid requested boards', () => {
  const visited = ['real_board_1', 'x3nn0emengo', 'real_board_2'];
  const requestedInvalidId = 'x3nn0emengo';

  const sanitized = visited.filter((id) => id !== requestedInvalidId).slice(0, 3);

  assert.deepEqual(sanitized, ['real_board_1', 'real_board_2']);
  assert.ok(!sanitized.includes('x3nn0emengo'));
});

test('404 error page path formatter handles requestedBoardId vs pathname', () => {
  const getDisplayPath = (requestedBoardId, pathname) => {
    return requestedBoardId ? `/b/${requestedBoardId}` : pathname;
  };

  assert.equal(getDisplayPath('x3nn0emengo', '/b/x3nn0emengo'), '/b/x3nn0emengo');
  assert.equal(getDisplayPath(undefined, '/nao-existe'), '/nao-existe');
  assert.equal(getDisplayPath('', '/qualquer-coisa'), '/qualquer-coisa');
});
