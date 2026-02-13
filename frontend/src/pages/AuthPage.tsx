import { FormEvent } from 'react';
import { LoginForm } from '../components/Auth/LoginForm';
import { RegisterForm } from '../components/Auth/RegisterForm';

type Props = {
  mode: 'login' | 'register';
  setMode: (mode: 'login' | 'register') => void;
  email: string;
  password: string;
  pseudo: string;
  username: string;
  avatar: string;
  error: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setPseudo: (v: string) => void;
  setUsername: (v: string) => void;
  setAvatar: (v: string) => void;
  submitAuth: (e: FormEvent) => void;
};

export default function AuthPage(props: Props) {
  const { mode, setMode, email, password, pseudo, username, avatar, error, setEmail, setPassword, setPseudo, setUsername, setAvatar, submitAuth } = props;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Minicord Night</h1>
        <p>Messagerie locale élégante, rapide et 100% dark.</p>
        <div className="mode-switch">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Connexion</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Inscription</button>
        </div>
        {mode === 'login' ? (
          <LoginForm email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={error} onSubmit={submitAuth} />
        ) : (
          <RegisterForm pseudo={pseudo} username={username} avatar={avatar} email={email} password={password} setPseudo={setPseudo} setUsername={setUsername} setAvatar={setAvatar} setEmail={setEmail} setPassword={setPassword} error={error} onSubmit={submitAuth} />
        )}
      </section>
    </main>
  );
}
