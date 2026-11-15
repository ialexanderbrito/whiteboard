import test from 'node:test';
import assert from 'node:assert/strict';
import { hashBoardPassword, verifyBoardPassword, constantTimeEquals } from '../src/utils/security.ts';

test('hashBoardPassword: computes consistent SHA-256 hex string', async () => {
  const hash1 = await hashBoardPassword('minhasenha123');
  const hash2 = await hashBoardPassword('minhasenha123');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test('hashBoardPassword: salt changes hash output and binds to boardId', async () => {
  const unsalted = await hashBoardPassword('minhasenha123');
  const saltedBoardA = await hashBoardPassword('minhasenha123', 'board_a1');
  const saltedBoardB = await hashBoardPassword('minhasenha123', 'board_b2');

  assert.notEqual(unsalted, saltedBoardA);
  assert.notEqual(saltedBoardA, saltedBoardB);
});

test('verifyBoardPassword: verifies matching plain password against hash', async () => {
  const hash = await hashBoardPassword('senhaSegura@2026');
  const valid = await verifyBoardPassword('senhaSegura@2026', hash);
  const invalid = await verifyBoardPassword('senhaErrada', hash);
  assert.equal(valid, true);
  assert.equal(invalid, false);
});

test('verifyBoardPassword: verifies salted password when salt is provided', async () => {
  const saltedHash = await hashBoardPassword('senhaComplexa#99', 'board_xyz123');
  const valid = await verifyBoardPassword('senhaComplexa#99', saltedHash, 'board_xyz123');
  const wrongPass = await verifyBoardPassword('senhaIncorreta', saltedHash, 'board_xyz123');
  const wrongBoard = await verifyBoardPassword('senhaComplexa#99', saltedHash, 'board_outro');

  assert.equal(valid, true);
  assert.equal(wrongPass, false);
  assert.equal(wrongBoard, false);
});

test('verifyBoardPassword: supports legacy plain-text password backwards compatibility', async () => {
  const valid = await verifyBoardPassword('senhaLegada', 'senhaLegada');
  const invalid = await verifyBoardPassword('senhaErrada', 'senhaLegada');
  assert.equal(valid, true);
  assert.equal(invalid, false);
});

test('constantTimeEquals: compares strings securely', () => {
  assert.equal(constantTimeEquals('abc', 'abc'), true);
  assert.equal(constantTimeEquals('abc', 'abd'), false);
  assert.equal(constantTimeEquals('abc', 'abcd'), false);
  assert.equal(constantTimeEquals('', ''), true);
});
