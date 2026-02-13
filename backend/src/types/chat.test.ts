import assert from 'node:assert/strict';
import test from 'node:test';
import { isParticipantInDmRoom, normalizeDmRoom } from './chat.js';

test('normalizeDmRoom sorts ids to stable room name', () => {
  assert.equal(normalizeDmRoom('b', 'a'), 'dm:a:b');
  assert.equal(normalizeDmRoom('a', 'b'), 'dm:a:b');
});

test('isParticipantInDmRoom validates participant membership', () => {
  assert.equal(isParticipantInDmRoom('dm:user-1:user-2', 'user-1'), true);
  assert.equal(isParticipantInDmRoom('dm:user-1:user-2', 'user-3'), false);
  assert.equal(isParticipantInDmRoom('group:1', 'user-1'), false);
});
