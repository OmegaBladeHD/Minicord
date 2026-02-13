import { z } from 'zod';

export const registerSchema = z.object({
  pseudo: z.string().min(2).max(32),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email().max(150),
  password: z.string().min(8).max(128),
  avatar: z.string().url().optional().or(z.literal(''))
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(40)
});
