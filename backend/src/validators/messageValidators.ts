import { z } from 'zod';
import { messageContentSchema } from './commonValidators.js';

export const sendMessageSchema = z.object({
  targetType: z.enum(['dm', 'group']),
  targetId: z.string().min(1),
  content: messageContentSchema
});

export const searchMessagesSchema = z.object({
  q: z.string().min(2).max(100),
  conversationId: z.string().min(1),
  targetType: z.enum(['dm', 'group'])
});
