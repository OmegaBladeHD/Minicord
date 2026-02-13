import { FormEvent } from 'react';

type Props = {
  pseudo: string;
  username: string;
  avatar: string;
  email: string;
  password: string;
  setPseudo: (v: string) => void;
  setUsername: (v: string) => void;
  setAvatar: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  error: string;
  onSubmit: (e: FormEvent) => void;
};

export const RegisterForm = ({
  pseudo,
  username,
  avatar,
  email,
  password,
  setPseudo,
  setUsername,
  setAvatar,
  setEmail,
  setPassword,
  error,
  onSubmit
}: Props) => (
  <form onSubmit={onSubmit} className="stack">
    <input placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
    <input placeholder="Identifiant unique" value={username} onChange={(e) => setUsername(e.target.value)} />
    <input placeholder="Avatar URL (optionnel)" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
    <input
      type="password"
      placeholder="Mot de passe"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    {error && <p className="error">{error}</p>}
    <button>Créer mon compte</button>
  </form>
);
