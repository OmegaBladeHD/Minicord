export type ChatMessage = {
  id: string;
  authorId: string;
  authorPseudo?: string;
  authorAvatar?: string | null;
  content: string;
  timestamp: string;
};

export type Conversation = { type: 'dm' | 'group'; id: string; label: string };
