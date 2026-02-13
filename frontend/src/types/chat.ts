export type MessageReaction = { emoji: string; count: number };

export type ChatMessage = {
  id: string;
  authorId: string;
  authorPseudo?: string;
  authorAvatar?: string | null;
  content: string;
  timestamp: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  reactions?: MessageReaction[];
  targetType?: 'dm' | 'group';
  targetId?: string;
};

export type Conversation = { type: 'dm' | 'group'; id: string; label: string };

export type Me = {
  id: string;
  pseudo: string;
  username: string;
  email: string;
  avatar: string | null;
  status: string;
  role: 'user' | 'admin';
};

export type UserResult = {
  id: string;
  pseudo: string;
  username: string;
  avatar: string | null;
  status: string;
  unreadCount?: number;
};

export type GroupResult = { id: string; name: string; description: string | null; role: string; unreadCount?: number };
