import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import i18n from '../i18n';
import { api, setToken, clearToken, getToken } from '../lib/api';
import { AuthUser } from '../lib/types';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setLanguage: (lng: 'vi' | 'en') => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api
      .get('/auth/me')
      .then((r) => {
        setUser(r.data.user);
        if (r.data.user?.language) i18n.changeLanguage(r.data.user.language);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.data.token);
    setUser(r.data.user);
    if (r.data.user?.language) i18n.changeLanguage(r.data.user.language);
  }

  function logout() {
    clearToken();
    setUser(null);
    location.href = '/login';
  }

  async function setLanguage(lng: 'vi' | 'en') {
    i18n.changeLanguage(lng);
    if (user) {
      setUser({ ...user, language: lng });
      try { await api.patch('/auth/language', { language: lng }); } catch { /* ignore */ }
    }
  }

  return <Ctx.Provider value={{ user, loading, login, logout, setLanguage }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
