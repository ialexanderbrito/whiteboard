import test from 'node:test';
import assert from 'node:assert/strict';
import { hashBoardPassword, verifyBoardPassword } from '../src/utils/security.ts';

test('hashBoardPassword: computes consistent SHA-256 hex string', async () => {
  const hash1 = await hashBoardPassword('minhasenha123');
  const hash2 = await hashBoardPassword('minhasenha123');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test('verifyBoardPassword: verifies matching plain password against hash', async () => {
  const hash = await hashBoardPassword('senhaSegura@2026');
  const valid = await verifyBoardPassword('senhaSegura@2026', hash);
  const invalid = await verifyBoardPassword('senhaErrada', hash);
  assert.equal(valid, true);
  assert.equal(invalid, false);
});

test('verifyBoardPassword: supports legacy plain-text password backwards compatibility', async () => {
  const valid = await verifyBoardPassword('senhaLegada', 'senhaLegada');
  const invalid = await verifyBoardPassword('senhaErrada', 'senhaLegada');
  assert.equal(valid, true);
  assert.equal(invalid, false);
});
