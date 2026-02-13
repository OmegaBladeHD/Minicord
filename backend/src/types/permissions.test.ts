import assert from 'node:assert/strict';
import test from 'node:test';
import { groupRolePermissions, hasPermission, Permission } from './permissions.js';

test('owner has role management permission', () => {
  assert.equal(hasPermission(groupRolePermissions.owner, Permission.MANAGE_ROLES), true);
});

test('member cannot remove other members', () => {
  assert.equal(hasPermission(groupRolePermissions.member, Permission.REMOVE_MEMBER), false);
});
