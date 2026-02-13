import { query } from '../config/db.js';

export type UserRole = 'user' | 'admin';

export const findUserByEmailOrUsername = async (email: string, username: string) =>
  query<{ id: string }>('SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1', [email, username]);

export const createUser = async (payload: {
  pseudo: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string | null;
}) =>
  query<{ id: string; role: UserRole }>(
    `INSERT INTO users (pseudo, username, email, password_hash, avatar, status, role)
     VALUES ($1, $2, $3, $4, $5, 'offline', 'user')
     RETURNING id, role`,
    [payload.pseudo, payload.username, payload.email, payload.passwordHash, payload.avatar]
  );

export const findUserByEmail = async (email: string) =>
  query<{
    id: string;
    pseudo: string;
    email: string;
    password_hash: string;
    role: UserRole;
  }>('SELECT id, pseudo, email, password_hash, role FROM users WHERE email = $1 LIMIT 1', [email]);

export const findUserById = async (userId: string) =>
  query<{ id: string; email: string; pseudo: string; role: UserRole }>(
    'SELECT id, email, pseudo, role FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
