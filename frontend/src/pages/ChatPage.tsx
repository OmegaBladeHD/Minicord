import { FormEvent } from 'react';
import { MessageComposer } from '../components/Chat/MessageComposer';
import { MessageList } from '../components/Chat/MessageList';
import { ConversationList } from '../components/Sidebar/ConversationList';
import { UserProfile } from '../components/Sidebar/UserProfile';
import { ChatMessage, Conversation, GroupResult, Me, UserResult } from '../types/chat';

type Props = {
  me: Me | null;
  groups: GroupResult[];
  searchResults: UserResult[];
  conversation: Conversation | null;
  query: string;
  setQuery: (value: string) => void;
  createGroup: () => void;
  searchUsers: (e: FormEvent) => void;
  openDm: (user: UserResult) => void;
  selectGroup: (group: GroupResult) => void;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  typingText: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  content: string;
  onTyping: (v: string) => void;
  sendMessage: (e: FormEvent) => void;
  sendError: string;
  inCall: boolean;
  onStartCall: () => void;
};

export default function ChatPage(props: Props) {
  const {
    me,
    groups,
    searchResults,
    conversation,
    query,
    setQuery,
    createGroup,
    searchUsers,
    openDm,
    selectGroup,
    messages,
    isLoadingMessages,
    typingText,
    onAddReaction,
    onEditMessage,
    onDeleteMessage,
    content,
    onTyping,
    sendMessage,
    sendError,
    inCall,
    onStartCall
  } = props;

  return (
    <main className="app-shell">
      <aside className="panel left">
        <UserProfile me={me} />
        <button className="ghost" onClick={createGroup} data-tooltip="Créer un nouveau groupe">+ Nouveau groupe</button>
        <form onSubmit={searchUsers} className="stack compact">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un utilisateur" />
          <button data-tooltip="Rechercher des utilisateurs">Rechercher</button>
        </form>
        <ConversationList groups={groups} users={searchResults} onOpenDm={openDm} onSelectGroup={selectGroup} active={conversation} />
      </aside>
      <section className="panel chat">
        <header className="chat-header">
          <h2>{conversation?.label ?? 'Choisir une conversation'}</h2>
          <div className="header-actions">
            {conversation && (
              <button className="ghost call-btn" onClick={onStartCall} data-tooltip={inCall ? 'Raccrocher' : 'Démarrer appel vocal'}>
                {inCall ? '📴' : '📞'}
              </button>
            )}
          </div>
        </header>
        <MessageList
          messages={messages}
          me={me}
          isLoading={isLoadingMessages}
          typingText={typingText}
          onAddReaction={onAddReaction}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
        />
        <MessageComposer content={content} maxLength={2000} disabled={!conversation} onChange={onTyping} onSubmit={sendMessage} error={sendError} />
      </section>
    </main>
  );
}
