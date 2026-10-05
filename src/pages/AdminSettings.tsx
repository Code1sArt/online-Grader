import { useState } from 'react';
import { Settings2, SquareTerminal } from 'lucide-react';
import { ErrorBox, Heading, Loading } from '../components/ui';
import { api, json, message } from '../lib/api';
import { useResource } from '../lib/hooks';
import type { SystemSettings } from '../types';

export function AdminSettings() {
  const { data, loading, error, reload } = useResource<SystemSettings>('/settings');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  async function toggle() {
    if (!data || busy) return;
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const next = !data.playgroundEnabled;
      await api<SystemSettings>('/settings', json('PATCH', { playgroundEnabled: next }));
      setNotice(next ? 'เปิดใช้งาน Playground แล้ว' : 'ปิดใช้งาน Playground แล้ว');
      reload();
    } catch (caught) {
      setActionError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Heading eyebrow="ADMIN / SETTINGS" title="ตั้งค่าระบบ">
        ควบคุมฟีเจอร์ส่วนกลางที่ผู้ใช้งานสามารถเข้าถึงได้
      </Heading>
      {notice && <div className="notice">{notice}</div>}
      <ErrorBox error={actionError} />
      <section className="panel settings-panel">
        <div className="panel-title">
          <h2>
            <Settings2 size={19} /> ฟีเจอร์ของระบบ
          </h2>
        </div>
        {loading ? (
          <Loading />
        ) : error || !data ? (
          <ErrorBox error={error || 'โหลดการตั้งค่าไม่ได้'} retry={reload} />
        ) : (
          <div className="setting-row">
            <div className="setting-icon">
              <SquareTerminal />
            </div>
            <div className="setting-copy">
              <div className="setting-title">
                <h3>Playground</h3>
                <span className={`setting-state ${data.playgroundEnabled ? 'enabled' : ''}`}>
                  {data.playgroundEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
              <p>อนุญาตให้ผู้ใช้ทดลองเขียนและรันโค้ด C++ หรือ Python โดยไม่ต้องเลือกโจทย์</p>
              <small>เมื่อปิด ระบบจะปฏิเสธคำขอรันโค้ดจากผู้ใช้ทันที</small>
            </div>
            <button
              type="button"
              className={`switch ${data.playgroundEnabled ? 'on' : ''}`}
              role="switch"
              aria-checked={data.playgroundEnabled}
              aria-label={data.playgroundEnabled ? 'ปิด Playground' : 'เปิด Playground'}
              disabled={busy}
              onClick={() => void toggle()}
            >
              <span />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
