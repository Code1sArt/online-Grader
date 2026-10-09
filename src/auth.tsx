import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, json, tokenStore, message } from './lib/api';
import { PrivacyGate } from './components/PrivacyGate';
import { confirmAction } from './lib/dialogs';
import type { Session, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
  acceptPrivacy: (version: string) => Promise<void>;
}
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setError('');
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<User>('/auth/me', { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setUser(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    window.addEventListener('nr-session-expired', logout);
    return () => window.removeEventListener('nr-session-expired', logout);
  }, [logout]);
  const acceptPrivacy = useCallback(async (version: string) => {
    const updated = await api<User>('/auth/consent', json('POST', { accepted: true, version }));
    setUser(updated);
  }, []);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener('nr-privacy-required', refresh);
    return () => window.removeEventListener('nr-privacy-required', refresh);
  }, []);
  async function login(credential: string) {
    const session = await api<Session>('/auth/google', json('POST', { idToken: credential }));
    tokenStore.set(session.accessToken);
    setUser(session.user);
    setError('');
  }
  return (
    <Context.Provider
      value={{ user, loading, error, login, logout, acceptPrivacy, retry: () => setRevision((n) => n + 1) }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
export function Protected({ admin = false }: { admin?: boolean }) {
  const { user, loading, error, retry, logout } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="fullscreen-state" role="status">
        กำลังเปิดพื้นที่ทำงาน…
      </div>
    );
  if (error && tokenStore.get())
    return (
      <div className="fullscreen-state">
        <p role="alert">{error}</p>
        <button onClick={retry}>ลองอีกครั้ง</button>
        <button
          onClick={async () => {
            if (await confirmAction('ออกจากเซสชันนี้และกลับไปเข้าสู่ระบบ?', 'ออกจากระบบ')) logout();
          }}
        >
          กลับไปเข้าสู่ระบบ
        </button>
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (user.requiresPrivacyAcceptance) return <PrivacyGate />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/problems" replace />;
  return <Outlet />;
}
