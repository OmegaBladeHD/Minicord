import { useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { ChatMessage, Me } from '../../types/chat';
import { Message } from './Message';

type Props = {
  messages: ChatMessage[];
  me: Me | null;
  isLoading: boolean;
  typingText: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
};

type RowData = {
  items: ChatMessage[];
  me: Me | null;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
};

const Row = ({ index, style, data }: ListChildComponentProps<RowData>) => {
  const item = data.items[index];
  return (
    <div style={style} className="msg-row">
      <Message
        message={item}
        me={data.me}
        onAddReaction={data.onAddReaction}
        onEditMessage={data.onEditMessage}
        onDeleteMessage={data.onDeleteMessage}
      />
    </div>
  );
};

export const MessageList = ({ messages, me, isLoading, typingText, onAddReaction, onEditMessage, onDeleteMessage }: Props) => {
  const rowData = useMemo(() => ({ items: messages, me, onAddReaction, onEditMessage, onDeleteMessage }), [messages, me, onAddReaction, onEditMessage, onDeleteMessage]);

  if (isLoading) {
    return (
      <div className="messages">
        {[1, 2, 3].map((i) => (
          <div key={i} className="msg other">
            <div className="skeleton-row">
              <div className="skeleton skeleton-avatar" />
              <div className="skeleton skeleton-text" />
            </div>
            <div className="skeleton skeleton-text skeleton-wide" />
          </div>
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="messages">
        <p>Aucun message</p>
        {typingText && (
          <div className="typing-indicator">
            <span>{typingText}</span>
            <em className="dots"><i></i><i></i><i></i></em>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="messages messages-virtualized">
      <List height={460} itemCount={messages.length} itemSize={96} width="100%" itemData={rowData} overscanCount={10}>
        {Row}
      </List>
      {typingText && (
        <div className="typing-indicator">
          <span>{typingText}</span>
          <em className="dots"><i></i><i></i><i></i></em>
        </div>
      )}
    </div>
  );
};
