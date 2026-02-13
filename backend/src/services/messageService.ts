import { query } from '../config/db.js';
import { TargetType } from '../types/chat.js';

export const createMessage = async (authorId: string, targetType: TargetType, targetId: string, content: string) =>
  query<{ id: string; created_at: string }>(
    `INSERT INTO messages (author_id, target_type, target_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [authorId, targetType, targetId, content]
  );
