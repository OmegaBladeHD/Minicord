import { FormEvent } from 'react';

type Props = {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  error: string;
  onSubmit: (e: FormEvent) => void;
};

export const LoginForm = ({ email, password, setEmail, setPassword, error, onSubmit }: Props) => (
  <form onSubmit={onSubmit} className="stack">
    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
    <input
      type="password"
      placeholder="Mot de passe"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    {error && <p className="error">{error}</p>}
    <button>Entrer</button>
  </form>
);
