import { Me } from '../../types/chat';

export const UserProfile = ({ me }: { me: Me | null }) => (
  <div className="profile">
    <div className="avatar">{me?.pseudo?.slice(0, 1).toUpperCase()}</div>
    <div>
      <strong>{me?.pseudo}</strong>
      <span>@{me?.username}</span>
    </div>
    <span className={`status-dot ${me?.status === 'online' ? 'online' : 'offline'}`}></span>
  </div>
);
