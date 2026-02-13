import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { ChatMessage, Conversation, GroupResult, UserResult } from '../types/chat';

type ChatContextType = {
  conversation: Conversation | null;
  setConversation: (conv: Conversation | null) => void;
  messages: ChatMessage[];
  setMessages: (items: ChatMessage[]) => void;
  appendMessage: (item: ChatMessage) => void;
  groups: GroupResult[];
  setGroups: (items: GroupResult[]) => void;
  searchResults: UserResult[];
  setSearchResults: (items: UserResult[]) => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);

  const value = useMemo(
    () => ({
      conversation,
      setConversation,
      messages,
      setMessages,
      appendMessage: (item: ChatMessage) => setMessages((prev) => [...prev, item]),
      groups,
      setGroups,
      searchResults,
      setSearchResults
    }),
    [conversation, messages, groups, searchResults]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatStore = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatStore must be used in ChatProvider');
  return ctx;
};
