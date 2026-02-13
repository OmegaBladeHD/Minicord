import { Conversation, GroupResult, UserResult } from '../../types/chat';
import { ConversationItem } from './ConversationItem';

type Props = {
  groups: GroupResult[];
  users: UserResult[];
  onOpenDm: (user: UserResult) => void;
  onSelectGroup: (group: GroupResult) => void;
  active: Conversation | null;
};

export const ConversationList = ({ groups, users, onOpenDm, onSelectGroup, active }: Props) => (
  <div className="list">
    {users.map((u) => (
      <ConversationItem key={`dm-${u.id}`} kind="dm" user={u} active={active} onOpenDm={onOpenDm} onSelectGroup={onSelectGroup} />
    ))}

    {groups.map((g) => (
      <ConversationItem key={`group-${g.id}`} kind="group" group={g} active={active} onOpenDm={onOpenDm} onSelectGroup={onSelectGroup} />
    ))}
  </div>
);
