import { useEffect, useRef, useState } from 'react';
import { ErrorBox } from './ui';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
export function GoogleSignIn({ onCredential }: { onCredential: (credential: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith('your-')) {
      setError('ยังไม่ได้ตั้งค่า Google Login กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }
    let active = true;
    setError('');
    setReady(false);
    function render() {
      if (!active || !container.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callback.current(response.credential),
        auto_select: false,
      });
      container.current.replaceChildren();
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: Math.min(300, container.current.clientWidth || 300),
        locale: 'th',
      });
      setReady(true);
    }
    if (window.google) {
      render();
      return () => {
        active = false;
      };
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    script.onerror = () => {
      if (active) setError('โหลด Google Login ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
    };
    document.head.append(script);
    const timer = window.setTimeout(() => {
      if (active && !window.google) setError('Google Login ใช้เวลานาน กรุณาลองอีกครั้ง');
    }, 15000);
    return () => {
      active = false;
      window.clearTimeout(timer);
      script.remove();
    };
  }, [revision]);
  return (
    <div className="google-signin">
      <div ref={container} />
      {!ready && !error && <p role="status">กำลังโหลด Google Login…</p>}
      <ErrorBox error={error} retry={() => setRevision((n) => n + 1)} />
    </div>
  );
}
