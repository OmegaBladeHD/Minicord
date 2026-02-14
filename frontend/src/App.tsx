import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from './configEnv';
import { useAuthStore } from './stores/authStore';
import { useChatStore } from './stores/chatStore';
import { ChatMessage, GroupResult, UserResult } from './types/chat';

const API = config.apiUrl;
const normalizeDmRoom = (a: string, b: string) => ['dm', ...[a, b].sort()].join(':');
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

type PresenceEvent = { userId: string; status: string };
type TypingEvent = {
  userId: string;
  pseudo?: string;
  targetType?: 'dm' | 'group';
  targetId?: string;
  conversationType?: 'dm' | 'group';
  conversationId?: string;
  isTyping?: boolean;
};

const toConversationFromTyping = (event: TypingEvent) => {
  if (event.conversationType && event.conversationId) {
    return { type: event.conversationType, id: event.conversationId };
  }

  if (event.targetType && event.targetId) {
    return { type: event.targetType, id: event.targetId };
  }

  return null;
};

export const App = () => {
  const { accessToken, setTokens, me, setMe } = useAuthStore();
  const { conversation, setConversation, messages, setMessages, appendMessage, groups, setGroups, searchResults, setSearchResults } = useChatStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const typingIntervalRef = useRef<number | null>(null);

  const socket = useMemo<Socket | null>(() => (accessToken ? io(API, { auth: { token: accessToken } }) : null), [accessToken]);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }), [accessToken]);

  const typingText = useMemo(() => {
    if (!typingUsers.size) return '';
    return `${typingUsers.size} personne${typingUsers.size > 1 ? 's' : ''} en train d'écrire...`;
  }, [typingUsers]);

  const playNotificationSound = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 840;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  const fetchMeAndGroups = useCallback(async () => {
    const [meRes, groupsRes] = await Promise.all([
      fetch(`${API}/api/users/me`, { headers: authHeaders }),
      fetch(`${API}/api/groups/mine`, { headers: authHeaders })
    ]);
    if (meRes.ok) setMe(await meRes.json());
    if (groupsRes.ok) setGroups(await groupsRes.json());
  }, [authHeaders, setGroups, setMe]);

  useEffect(() => {
    if (!accessToken) return;
    void fetchMeAndGroups();
  }, [accessToken, fetchMeAndGroups]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  }, []);

  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true);
    const onBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: ChatMessage & { targetType: 'dm' | 'group'; targetId: string }) => {
      if (!conversation) return;
      if (msg.targetType !== conversation.type || msg.targetId !== conversation.id) return;
      appendMessage(msg);
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(`Nouveau message de ${msg.authorPseudo ?? 'Utilisateur'}`, { body: msg.content });
        playNotificationSound();
      }
    };

    const onReactionAdded = ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id !== messageId
            ? m
            : {
                ...m,
                reactions: (() => {
                  const existing = m.reactions ?? [];
                  const found = existing.find((r) => r.emoji === emoji);
                  if (!found) return [...existing, { emoji, count: 1 }];
                  return existing.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r));
                })()
              }
        )
      );
    };

    const onMessageEdited = ({ messageId, content: nextContent, editedAt }: { messageId: string; content: string; editedAt: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: nextContent, editedAt } : m)));
    };

    const onMessageDeleted = ({ messageId, deletedAt }: { messageId: string; deletedAt?: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: '[Message supprimé]', deletedAt: deletedAt ?? new Date().toISOString() } : m)));
    };

    const onTyping = (event: TypingEvent) => {
      const target = toConversationFromTyping(event);
      if (!target || !conversation) return;
      if (target.type !== conversation.type || target.id !== conversation.id) return;
      if (event.userId === me?.id) return;

      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.add(event.userId);
        return next;
      });
    };

    const onStopTyping = (event: TypingEvent) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(event.userId);
        return next;
      });
    };

    const onPresence = (event: PresenceEvent) => {
      setSearchResults((prev) => prev.map((u) => (u.id === event.userId ? { ...u, status: event.status } : u)));
      if (me?.id === event.userId) setMe((prev) => (prev ? { ...prev, status: event.status } : prev));
    };

    socket.on('message:new', onMessage);
    socket.on('reaction:added', onReactionAdded);
    socket.on('message:updated', onMessageEdited);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('user:typing', onTyping);
    socket.on('user:stop-typing', onStopTyping);
    socket.on('presence:update', onPresence);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('reaction:added', onReactionAdded);
      socket.off('message:updated', onMessageEdited);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('user:typing', onTyping);
      socket.off('user:stop-typing', onStopTyping);
      socket.off('presence:update', onPresence);
    };
  }, [socket, conversation, appendMessage, setSearchResults, me?.id, setMe, setMessages]);

  useEffect(() => {
    if (!socket || !conversation) return;

    const emitTyping = () => {
      socket.emit('typing', { conversationId: conversation.id, conversationType: conversation.type });
    };

    const shouldType = !!content.trim() && isWindowFocused;
    if (shouldType) {
      emitTyping();
      typingIntervalRef.current = window.setInterval(emitTyping, 3000);
    } else {
      socket.emit('stop-typing', { conversationId: conversation.id, conversationType: conversation.type });
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    }

    return () => {
      socket.emit('stop-typing', { conversationId: conversation.id, conversationType: conversation.type });
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [content, isWindowFocused, conversation, socket]);

  useEffect(() => {
    if (!conversation || !accessToken) return;
    setTypingUsers(new Set());
    setInCall(false);
    setIsLoadingMessages(true);

    if (socket) {
      if (conversation.type === 'group') {
        socket.emit('join:group', conversation.id);
      } else {
        const peer = conversation.id.replace('dm:', '').split(':').find((id) => id !== me?.id);
        if (peer) socket.emit('join:dm', peer);
      }
    }

    fetch(`${API}/api/messages/${conversation.type}/${conversation.id}?limit=50`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setMessages(data.items ?? []))
      .finally(() => setIsLoadingMessages(false));
  }, [conversation, accessToken, socket, me?.id, setMessages]);

  useEffect(() => {
    if (!socket) return;
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = mode === 'login' ? 'login' : 'register';
    const payload = mode === 'login' ? { email, password } : { email, password, pseudo: pseudo || username, username, avatar };
    const response = await fetch(`${API}/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) return setError(data?.error ?? 'Auth failed');
    setTokens(data.accessToken, data.refreshToken);
  };

  const onTyping = (value: string) => {
    setContent(value);
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    setSendError('');
    if (!socket || !conversation || !content.trim()) return;
    socket.emit('message:send', { targetType: conversation.type, targetId: conversation.id, content }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok) return setSendError(ack?.error ?? 'Échec envoi');
      setContent('');
    });
  };

  const onAddReaction = (messageId: string, emoji: string) => {
    if (!socket || !conversation) return;
    socket.emit('reaction:add', { messageId, emoji, targetType: conversation.type, targetId: conversation.id });
  };

  const onEditMessage = (messageId: string, newContent: string) => {
    if (!socket) return;
    socket.emit('message:edit', { messageId, content: newContent });
  };

  const onDeleteMessage = (messageId: string) => {
    if (!socket) return;
    socket.emit('message:delete', { messageId });
  };

  const onStartCall = () => {
    if (!socket || !conversation) return;
    if (inCall) {
      setInCall(false);
      socket.emit('voice:state', { state: 'offline', bitrateKbps: 124 });
      return;
    }

    setInCall(true);
    socket.emit('voice:state', { state: 'in_call', bitrateKbps: 124 });
  };

  const searchUsers = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setSearchResults(await res.json());
  };

  const openDm = (user: UserResult) => {
    if (!me) return;
    setConversation({ type: 'dm', id: normalizeDmRoom(me.id, user.id), label: `${user.pseudo} (@${user.username})` });
  };

  const selectGroup = (group: GroupResult) => setConversation({ type: 'group', id: group.id, label: `# ${group.name}` });

  const createGroup = async () => {
    const name = prompt('Nom du groupe ?');
    if (!name) return;
    const res = await fetch(`${API}/api/groups`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name, description: 'Groupe local Minicord' }) });
    if (res.ok) await fetchMeAndGroups();
  };

  return (
    <Suspense fallback={<main className="auth-shell"><section className="auth-card"><div className="skeleton skeleton-text" /><div className="skeleton skeleton-text" /><div className="skeleton skeleton-text" /></section></main>}>
      {!accessToken ? (
        <AuthPage mode={mode} setMode={setMode} email={email} password={password} pseudo={pseudo} username={username} avatar={avatar} error={error} setEmail={setEmail} setPassword={setPassword} setPseudo={setPseudo} setUsername={setUsername} setAvatar={setAvatar} submitAuth={submitAuth} />
      ) : (
        <ChatPage
          me={me}
          groups={groups}
          searchResults={searchResults}
          conversation={conversation}
          query={query}
          setQuery={setQuery}
          createGroup={createGroup}
          searchUsers={searchUsers}
          openDm={openDm}
          selectGroup={selectGroup}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          typingText={typingText}
          onAddReaction={onAddReaction}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          content={content}
          onTyping={onTyping}
          sendMessage={sendMessage}
          sendError={sendError}
          inCall={inCall}
          onStartCall={onStartCall}
        />
      )}
    </Suspense>
  );
};
