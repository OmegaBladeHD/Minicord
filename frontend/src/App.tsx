import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API = 'http://localhost:4000';

type Me = {
  id: string;
  pseudo: string;
  username: string;
  email: string;
  avatar: string | null;
  status: string;
  role: 'user' | 'admin';
};

type UserResult = {
  id: string;
  pseudo: string;
  username: string;
  avatar: string | null;
  status: string;
};

type GroupResult = { id: string; name: string; description: string | null; role: string };

type Message = { id: string; authorId?: string; author_id?: string; content: string; timestamp?: string; created_at?: string };

type Conversation = { type: 'dm' | 'group'; id: string; label: string };

const normalizeDmRoom = (a: string, b: string) => ['dm', ...[a, b].sort()].join(':');

export const App = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState('');
  const [me, setMe] = useState<Me | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');

  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [inCall, setInCall] = useState(false);

  const socket = useMemo<Socket | null>(
    () => (token ? io(API, { auth: { token } }) : null),
    [token]
  );

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchMeAndGroups = async () => {
    const [meRes, groupRes] = await Promise.all([
      fetch(`${API}/api/users/me`, { headers: authHeaders }),
      fetch(`${API}/api/groups/mine`, { headers: authHeaders })
    ]);

    if (meRes.ok) setMe(await meRes.json());
    if (groupRes.ok) setGroups(await groupRes.json());
  };

  useEffect(() => {
    if (!token) return;
    void fetchMeAndGroups();
  }, [token]);

  useEffect(() => {
    if (!socket || !conversation) return;

    const onMessage = (msg: Message & { targetType?: 'dm' | 'group'; targetId?: string }) => {
      if (!conversation) return;
      const tType = msg.targetType ?? conversation.type;
      const tId = msg.targetId ?? conversation.id;
      if (tType !== conversation.type || tId !== conversation.id) return;
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('message:new', onMessage);

    if (conversation.type === 'group') socket.emit('join:group', conversation.id);
    else {
      const peerUserId = conversation.id.replace('dm:', '').split(':').find((id) => id !== me?.id);
      if (peerUserId) socket.emit('join:dm', peerUserId);
    }

    return () => {
      socket.off('message:new', onMessage);
    };
  }, [socket, conversation, me?.id]);

  useEffect(() => {
    if (!conversation || !token) return;
    const url = `${API}/api/messages/${conversation.type}/${conversation.id}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Message[]) => setMessages(data));
  }, [conversation, token]);

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const path = mode === 'login' ? 'login' : 'register';
    const payload =
      mode === 'login'
        ? { email, password }
        : { email, password, pseudo: pseudo || username, username, avatar };

    const response = await fetch(`${API}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data?.error ?? 'Authentication failed');
      return;
    }

    setToken(data.token);
  };

  const openDm = (user: UserResult) => {
    if (!me) return;
    const room = normalizeDmRoom(me.id, user.id);
    setConversation({ type: 'dm', id: room, label: `${user.pseudo} (@${user.username})` });
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!socket || !conversation || !content.trim()) return;

    socket.emit(
      'message:send',
      { targetType: conversation.type, targetId: conversation.id, content },
      (ack: { ok: boolean }) => {
        if (ack?.ok) setContent('');
      }
    );
  };

  const toggleVoice = () => {
    if (!socket) return;
    const next = !inCall;
    setInCall(next);
    socket.emit('voice:state', next ? 'in_call' : 'offline');
  };

  const searchUsers = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setSearchResults(await res.json());
  };

  const createGroup = async () => {
    const name = prompt('Nom du groupe ?');
    if (!name) return;

    const res = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name, description: 'Groupe local Minicord' })
    });

    if (res.ok) {
      await fetchMeAndGroups();
    }
  };

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>Minicord Night</h1>
          <p>Messagerie locale élégante, rapide et 100% dark.</p>
          <div className="mode-switch">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Connexion</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Inscription</button>
          </div>

          <form onSubmit={submitAuth} className="stack">
            {mode === 'register' && (
              <>
                <input placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
                <input placeholder="Identifiant unique" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input placeholder="Avatar URL (optionnel)" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
              </>
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button>{mode === 'login' ? 'Entrer' : 'Créer mon compte'}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="panel left">
        <div className="profile">
          <div className="avatar">{me?.pseudo?.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{me?.pseudo}</strong>
            <span>@{me?.username}</span>
          </div>
        </div>

        <button onClick={createGroup} className="ghost">+ Nouveau groupe</button>

        <form onSubmit={searchUsers} className="stack compact">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un utilisateur" />
          <button>Rechercher</button>
        </form>

        <div className="list">
          {searchResults.map((u) => (
            <button key={u.id} className="list-item" onClick={() => openDm(u)}>
              DM · {u.pseudo}
            </button>
          ))}
          {groups.map((g) => (
            <button
              key={g.id}
              className="list-item"
              onClick={() => setConversation({ type: 'group', id: g.id, label: `# ${g.name}` })}
            >
              # {g.name}
            </button>
          ))}
        </div>
      </aside>

      <section className="panel chat">
        <header>
          <h2>{conversation?.label ?? 'Choisir une conversation'}</h2>
          <button className={inCall ? 'danger' : 'ghost'} onClick={toggleVoice}>
            {inCall ? 'Quitter vocal' : 'Rejoindre vocal'}
          </button>
        </header>

        <div className="messages">
          {messages.map((m) => (
            <article key={m.id} className="msg">
              <p>{m.content}</p>
              <time>{new Date(m.timestamp ?? m.created_at ?? Date.now()).toLocaleTimeString()}</time>
            </article>
          ))}
        </div>

        <form onSubmit={sendMessage} className="composer">
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Écrire un message..." />
          <button>Envoyer</button>
        </form>
      </section>
    </main>
  );
};
