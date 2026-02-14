import { memo, useState } from 'react';
import { ChatMessage, Me } from '../../types/chat';
import { formatRelativeTime } from '../../utils/time';
import { getAvatarColor } from '../../utils/avatar';

type Props = {
  message: ChatMessage;
  me: Me | null;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
};

export const Message = memo(({ message, me, onAddReaction, onEditMessage, onDeleteMessage }: Props) => {
  const isOwn = message.authorId === me?.id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  if (message.deletedAt) {
    return (
      <article className={`msg ${isOwn ? 'own' : 'other'} deleted`}>
        <p>Message supprimé</p>
      </article>
    );
  }

  const saveEdit = () => {
    if (!draft.trim()) return;
    onEditMessage(message.id, draft.trim());
    setEditing(false);
  };

  return (
    <article className={`msg ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="msg-meta">
          <div className="avatar tiny" data-color={getAvatarColor(message.authorId)}>
            {(message.authorPseudo ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <strong>{message.authorPseudo ?? 'Utilisateur'}</strong>
        </div>
      )}

      {editing ? (
        <div className="msg-edit">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="button" onClick={saveEdit} data-tooltip="Sauvegarder">Sauver</button>
        </div>
      ) : (
        <p>{message.content}</p>
      )}

      <div className="msg-footer">
        <time>{formatRelativeTime(message.timestamp)} {message.editedAt ? '· modifié' : ''}</time>
        <div className="msg-actions">
          <button type="button" className="ghost mini" onClick={() => onAddReaction(message.id, '👍')} data-tooltip="Réagir avec 👍">👍</button>
          <button type="button" className="ghost mini" onClick={() => onAddReaction(message.id, '❤️')} data-tooltip="Réagir avec ❤️">❤️</button>
          <button type="button" className="ghost mini" onClick={() => onAddReaction(message.id, '😂')} data-tooltip="Réagir avec 😂">😂</button>
          {isOwn && (
            <>
              <button type="button" className="ghost mini" onClick={() => setEditing((v) => !v)} data-tooltip="Modifier le message">Éditer</button>
              <button type="button" className="ghost mini danger-soft" onClick={() => onDeleteMessage(message.id)} data-tooltip="Supprimer le message">Suppr</button>
            </>
          )}
        </div>
      </div>

      {!!message.reactions?.length && (
        <div className="reactions">
          {message.reactions.map((r) => (
            <span key={`${message.id}-${r.emoji}`} className="reaction-pill">{r.emoji} {r.count}</span>
          ))}
        </div>
      )}
    </article>
  );
});
