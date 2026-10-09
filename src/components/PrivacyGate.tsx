import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { api, message } from '../lib/api';
import { useAuth } from '../auth';
import { ErrorBox } from './ui';
export function PrivacyGate() {
  const { acceptPrivacy, logout } = useAuth();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function show() {
      try {
        const policy = await api<{ version: string; title: string; paragraphs: string[] }>('/auth/privacy', {
          signal: controller.signal,
        });
        if (!active) return;
        const result = await Swal.fire({
          title: policy.title,
          text: policy.paragraphs.join('\n\n'),
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'ยอมรับเงื่อนไข',
          cancelButtonText: 'ไม่ยอมรับ / ออกจากระบบ',
          allowOutsideClick: false,
          allowEscapeKey: false,
          focusCancel: true,
          confirmButtonColor: '#176b50',
          customClass: { popup: 'privacy-popup' },
        });
        if (!active) return;
        if (!result.isConfirmed) {
          logout();
          return;
        }
        await acceptPrivacy(policy.version);
      } catch (caught) {
        if (active) setError(message(caught));
      }
    }
    void show();
    return () => {
      active = false;
      controller.abort();
      Swal.close();
    };
  }, [acceptPrivacy, logout, revision]);
  return (
    <div className="fullscreen-state">
      <p>กรุณาอ่านและยอมรับข้อมูลความเป็นส่วนตัวก่อนเข้าใช้งาน</p>
      <ErrorBox error={error} />
      {error && (
        <button
          className="button primary"
          onClick={() => {
            setError('');
            setRevision((n) => n + 1);
          }}
        >
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}
