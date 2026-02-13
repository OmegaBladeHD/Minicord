import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(250).optional()
});

export const addMemberSchema = z.object({
  userId: z.string().uuid()
});
