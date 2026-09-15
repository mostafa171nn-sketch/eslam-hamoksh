'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  clearAuthSessionRecord,
  recordAuthSession,
  setUnauthorizedHandler,
  type Center,
} from '../lib/api';
import type { User } from '../lib/types';
import { dataCache } from '../lib/dataCache';

interface AuthContextValue {
  user: User | null;
  center: Center | null;
  loading: boolean;
  login: (username: string, password: string, centerId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const CENTER_KEY = 'maarech-center';

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredCenter(): Center | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CENTER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Center;
  } catch {
    return null;
  }
}

function storeCenter(center: Center | null) {
  try {
    if (center) {
      window.localStorage.setItem(CENTER_KEY, JSON.stringify(center));
    } else {
      window.localStorage.removeItem(CENTER_KEY);
    }
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [center, setCenterState] = useState<Center | null>(getStoredCenter);
  const [loading, setLoading] = useState(true);

  const setCenter = useCallback((c: Center | null) => {
    setCenterState(c);
    storeCenter(c);
  }, []);

  useEffect(() => {
    let active = true;
    // Safety net: never hold the whole UI hostage if /auth/me stalls.
    const timer = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 3500);
    api
      .get<User>('/auth/me')
      .then((res) => {
        if (active) {
          setUser(res.data);
          recordAuthSession();
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) {
          clearTimeout(timer);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setCenter(null);
      setLoading(false);
      // Session is gone/invalid — drop every cached response so no private
      // data (my-teachers, follows, children, cached dashboards) survives.
      dataCache.clear();
    };
    setUnauthorizedHandler(onUnauthorized);
    return () => setUnauthorizedHandler(() => {});
  }, [setCenter]);

  const login = useCallback(async (username: string, password: string, centerId?: string) => {
    const res = await api.login({ username, password, ...(centerId ? { centerId } : {}) });
    // Clear first so a previously cached session's private keys can never leak
    // into a different account using the same browser tab.
    dataCache.clear();
    setUser(res.data.user);
    setCenter(res.data.center ?? null);
  }, [setCenter]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setCenter(null);
      clearAuthSessionRecord();
      // Private dashboard/search caches must not survive the session.
      dataCache.clear();
    }
  }, [setCenter]);

  const refreshUser = useCallback(async () => {
    const res = await api.get<User>('/auth/me');
    // Clear stale cached private data (dashboards, follows, etc.) so a
    // session swap via OTP login never leaks one user's data to another.
    dataCache.clear();
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, center, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider.');
  return ctx;
}
