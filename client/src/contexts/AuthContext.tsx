import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SESSION_EXPIRED_EVENT, TOKEN_KEY } from '../services/api';
import { authApi } from '../services/gallery';
import type { User } from '../lib/types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextType {
  user: User | null;
  status: Status;
  /** Set when the last session ended because the token expired or was rejected. */
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>(() => (localStorage.getItem(TOKEN_KEY) ? 'loading' : 'anonymous'));
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Restore the session from a stored token so a page refresh doesn't log the user out.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    let cancelled = false;
    authApi
      .me()
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    const onExpired = () => {
      setSessionExpired(true);
      clearSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const startSession = useCallback((token: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
    setStatus('authenticated');
    setSessionExpired(false);
    return nextUser;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      status,
      sessionExpired,
      login: async (email, password) => {
        const { data } = await authApi.login(email, password);
        return startSession(data.token, data.user);
      },
      register: async (name, email, password) => {
        const { data } = await authApi.register(name, email, password);
        return startSession(data.token, data.user);
      },
      logout: () => {
        setSessionExpired(false);
        clearSession();
      },
    }),
    [user, status, sessionExpired, startSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
