import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Me } from '../types/chat';

type AuthContextType = {
  accessToken: string;
  refreshToken: string;
  me: Me | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setMe: (me: Me | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [me, setMe] = useState<Me | null>(null);

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      me,
      setTokens: (nextAccess: string, nextRefresh: string) => {
        setAccessToken(nextAccess);
        setRefreshToken(nextRefresh);
      },
      setMe
    }),
    [accessToken, refreshToken, me]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthStore = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthStore must be used in AuthProvider');
  return ctx;
};
