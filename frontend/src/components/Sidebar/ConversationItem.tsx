import { memo } from 'react';
import { Conversation, GroupResult, UserResult } from '../../types/chat';

type Props = {
  kind: 'dm' | 'group';
  user?: UserResult;
  group?: GroupResult;
  active: Conversation | null;
  onOpenDm: (user: UserResult) => void;
  onSelectGroup: (group: GroupResult) => void;
};

export const ConversationItem = memo(({ kind, user, group, active, onOpenDm, onSelectGroup }: Props) => {
  if (kind === 'dm' && user) {
    const isActive = active?.type === 'dm' && active.id.includes(user.id);
    return (
      <button className={`list-item ${isActive ? 'active' : ''}`} data-type="dm" onClick={() => onOpenDm(user)}>
        <span className={`status-dot ${user.status === 'online' ? 'online' : 'offline'}`}></span>
        DM · {user.pseudo}
        {!!user.unreadCount && <span className="unread-badge">{user.unreadCount}</span>}
      </button>
    );
  }

  if (kind === 'group' && group) {
    return (
      <button
        className={`list-item ${active?.type === 'group' && active.id === group.id ? 'active' : ''}`}
        data-type="group"
        onClick={() => onSelectGroup(group)}
      >
        {group.name}
        {!!group.unreadCount && <span className="unread-badge">{group.unreadCount}</span>}
      </button>
    );
  }

  return null;
});
