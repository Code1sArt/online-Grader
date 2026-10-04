import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Verdict } from '../types';

export const verdicts: Record<Verdict, string> = {
  QUEUED: 'รอตรวจ',
  JUDGING: 'กำลังตรวจ',
  ACCEPTED: 'ผ่านทุกเทส',
  PARTIAL: 'ผ่านบางเทส',
  WRONG_ANSWER: 'คำตอบไม่ถูกต้อง',
  COMPILE_ERROR: 'คอมไพล์ไม่ผ่าน',
  RUNTIME_ERROR: 'โปรแกรมทำงานผิดพลาด',
  TIME_LIMIT_EXCEEDED: 'เกินเวลาที่กำหนด',
  MEMORY_LIMIT_EXCEEDED: 'เกินหน่วยความจำ',
  SYSTEM_ERROR: 'ระบบตรวจขัดข้อง',
};
export function Badge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    ...verdicts,
    DRAFT: 'ฉบับร่าง',
    PUBLISHED: 'เผยแพร่แล้ว',
    ARCHIVED: 'เก็บถาวร',
    CLOSED: 'ปิดแล้ว',
  };
  const tone = ['ACCEPTED', 'PUBLISHED'].includes(status)
    ? 'green'
    : ['QUEUED', 'JUDGING', 'PARTIAL', 'DRAFT'].includes(status)
      ? 'amber'
      : ['CLOSED', 'ARCHIVED'].includes(status)
        ? 'gray'
        : 'red';
  return <span className={`badge ${tone}`}>{labels[status] || status}</span>;
}
export function Difficulty({ value }: { value: number }) {
  return (
    <span className={`difficulty level-${value}`}>
      {['', 'เริ่มต้น', 'พื้นฐาน', 'ปานกลาง', 'ท้าทาย', 'ขั้นสูง'][value] || value}
    </span>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={36} strokeWidth={1.4} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" />
      <p>กำลังโหลดข้อมูล…</p>
    </div>
  );
}
export function ErrorBox({ error, retry }: { error?: string; retry?: () => void }) {
  return error ? (
    <div className="error-box" role="alert">
      <AlertCircle size={19} />
      <span>{error}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          ลองอีกครั้ง
        </button>
      )}
    </div>
  ) : null;
}
export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
