import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const messageContentSchema = z.string().min(1).max(2000);
