import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { validateBody } from '../middleware/validate.js';
import { signToken } from '../services/jwt.js';

const registerSchema = z.object({
  pseudo: z.string().min(2),
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(8),
  avatar: z.string().url().optional().or(z.literal(''))
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const { pseudo, username, email, password, avatar } = req.body;

  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
    [email, username]
  );

  if (existing.rowCount) {
    return res.status(409).json({ error: 'Email or username already used' });
  }

  const passwordHash = await argon2.hash(password);
  const inserted = await query<{ id: string; role: 'user' | 'admin' }>(
    `INSERT INTO users (pseudo, username, email, password_hash, avatar, status, role)
     VALUES ($1, $2, $3, $4, $5, 'offline', 'user')
     RETURNING id, role`,
    [pseudo, username, email, passwordHash, avatar || null]
  );

  const user = inserted.rows[0];
  const token = signToken({ sub: user.id, email, pseudo, role: user.role });

  return res.status(201).json({ token });
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const result = await query<{
    id: string;
    pseudo: string;
    email: string;
    password_hash: string;
    role: 'user' | 'admin';
  }>('SELECT id, pseudo, email, password_hash, role FROM users WHERE email = $1 LIMIT 1', [email]);

  const user = result.rows[0];
  if (!user || !(await argon2.verify(user.password_hash, password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ sub: user.id, email: user.email, pseudo: user.pseudo, role: user.role });
  return res.json({ token });
});
