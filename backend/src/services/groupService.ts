import { query } from '../config/db.js';

export type GroupRole = 'owner' | 'admin' | 'member';

export const getUserRoleInGroup = async (groupId: string, userId: string) =>
  query<{ role: GroupRole }>('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, userId]);

export const createGroup = async (name: string, description: string | null, ownerId: string) =>
  query<{ id: string }>('INSERT INTO groups (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id', [name, description, ownerId]);

export const addGroupMember = async (groupId: string, userId: string, role: GroupRole) =>
  query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, userId, role]
  );
