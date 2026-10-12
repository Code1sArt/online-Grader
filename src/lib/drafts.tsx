import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, message } from './api';
import type { SystemSettings } from '../types';

export const draftVersionKey = 'nr-submission-draft-version';
function storedVersion() {
  try {
    return validVersion(Number(localStorage.getItem(draftVersionKey)));
  } catch {
    return 0;
  }
}
function validVersion(value: number) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

interface DraftState {
  version: number;
  ready: boolean;
  error: string;
  refresh: () => void;
  applyVersion: (version: number) => void;
}
const Context = createContext<DraftState | null>(null);

export function SubmissionDraftProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const current = useRef(0);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const applyVersion = useCallback((incoming: number) => {
    const saved = storedVersion();
    const next = Math.max(current.current, saved, validVersion(incoming));
    try {
      if (next > saved) {
        const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
        keys.forEach((key) => {
          if (key?.startsWith('nr-draft:')) localStorage.removeItem(key);
        });
      }
      localStorage.setItem(draftVersionKey, String(next));
    } catch {
      // Storage may be blocked; the version still resets the editor in memory.
    }
    current.current = next;
    setVersion(next);
    setReady(true);
    setError('');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api<SystemSettings>('/settings', { signal: controller.signal })
      .then((settings) => {
        if (!controller.signal.aborted) applyVersion(settings.submissionDraftVersion ?? 0);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(message(caught));
      });
    return () => controller.abort();
  }, [location.pathname, revision, applyVersion]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === draftVersionKey && event.newValue !== null) applyVersion(Number(event.newValue));
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh, applyVersion]);

  return (
    <Context.Provider value={{ version, ready, error, refresh, applyVersion }}>{children}</Context.Provider>
  );
}

export function useSubmissionDrafts() {
  const state = useContext(Context);
  if (!state) throw new Error('SubmissionDraftProvider missing');
  return state;
}

export function readSubmissionDraft(key: string, version: number, fallback: string) {
  try {
    if (storedVersion() > version) return fallback;
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeSubmissionDraft(key: string, version: number, code: string) {
  try {
    // A stale editor in another tab must not restore code after a reset.
    if (storedVersion() > version) return false;
    localStorage.setItem(key, code);
    return true;
  } catch {
    return false;
  }
}
