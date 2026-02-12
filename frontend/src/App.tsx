import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';

type ChatMessage = {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
};

export const App = () => {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [target, setTarget] = useState('dm:demo-room');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const socket = useMemo(
    () =>
      token
        ? io(API, {
            auth: { token }
          })
        : null,
    [token]
  );

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    socket.on('message:new', onMessage);

    const isGroup = target.startsWith('group:');
    if (isGroup) socket.emit('join:group', target.replace('group:', ''));
    else socket.emit('join:dm', target);

    return () => {
      socket.off('message:new', onMessage);
      socket.disconnect();
    };
  }, [socket, target]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    const response = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (data.token) setToken(data.token);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!socket || !content.trim()) return;

    const targetType = target.startsWith('group:') ? 'group' : 'dm';
    const targetId = targetType === 'group' ? target.replace('group:', '') : target;

    socket.emit('message:send', { targetType, targetId, content }, (ack: any) => {
      if (ack?.ok) setContent('');
    });
  };

  if (!token) {
    return (
      <main className="container">
        <h1>Minicord</h1>
        <form onSubmit={login} className="card">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button>Login</button>
        </form>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Minicord local</h1>
      <div className="card">
        <label>Room ID (ex: dm:uuid1:uuid2 ou group:uuid)</label>
        <input value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <section className="chat card">
        {messages.map((msg) => (
          <p key={msg.id}>
            <strong>{msg.authorId.slice(0, 6)}</strong> {msg.content}
          </p>
        ))}
      </section>
      <form onSubmit={send} className="card send">
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Votre message" />
        <button>Envoyer</button>
      </form>
    </main>
  );
};
