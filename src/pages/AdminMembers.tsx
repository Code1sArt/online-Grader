import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, json, message } from '../lib/api';
import { useResource, number, dateTime } from '../lib/hooks';
import { Empty, ErrorBox, Heading, Loading } from '../components/ui';
import type { User } from '../types';
type Usage = {
  loginCount: number;
  submissionCount: number;
  playgroundCount: number;
  graderRunCount: number;
  lastUsedAt: string;
};
type Member = User & {
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  usage: Usage | null;
  _count: { submissions: number };
};
type Activity = {
  id: string;
  kind: 'LOGIN' | 'SUBMISSION' | 'PLAYGROUND';
  ip: string | null;
  createdAt: string;
};
const eventNames = { LOGIN: 'เข้าสู่ระบบ', SUBMISSION: 'ส่งคำตอบ', PLAYGROUND: 'รัน Playground' };
export function AdminMembers() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [state, setState] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<{ items: Member[]; total: number; pageSize: number }>(
    `/members?state=${state}&page=${page}&search=${encodeURIComponent(applied)}`,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  async function change(member: Member, remove = false) {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await api(`/members/${member.id}${remove ? '' : '/status'}`, {
        ...json(remove ? 'DELETE' : 'PATCH', remove ? undefined : { isActive: !member.isActive }),
        confirmation: remove
          ? `ลบสมาชิก ${member.displayName} ออกจากการใช้งาน? บัญชีจะเข้าไม่ได้ และประวัติการเรียนกับโค้ดยังคงเก็บไว้ตรวจสอบ`
          : `${member.isActive ? 'บล็อก' : 'ปลดบล็อก'}สมาชิก ${member.displayName}?`,
      });
      reload();
    } catch (caught) {
      setActionError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  function find(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied(search);
  }
  return (
    <div className="page">
      <Heading eyebrow="ADMIN / MEMBERS" title="จัดการสมาชิก">
        บล็อก ลบ และตรวจประวัติการใช้งานของสมาชิก
      </Heading>
      <ErrorBox error={actionError} />
      <form className="member-filters" onSubmit={find}>
        <input
          aria-label="ค้นหาสมาชิก"
          placeholder="ชื่อหรืออีเมล"
          maxLength={200}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="button secondary">ค้นหา</button>
        <select
          aria-label="สถานะสมาชิก"
          value={state}
          onChange={(e) => {
            setPage(1);
            setState(e.target.value);
          }}
        >
          <option value="all">สมาชิกปัจจุบันทั้งหมด</option>
          <option value="active">ใช้งานได้</option>
          <option value="blocked">ถูกบล็อก</option>
          <option value="deleted">สมาชิกที่ลบแล้ว</option>
        </select>
      </form>
      <section className="panel">
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>สมาชิก</th>
                  <th>สถานะ</th>
                  <th>ส่งคำตอบ</th>
                  <th>เรียกตัวตรวจ</th>
                  <th>ประวัติ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.displayName}</strong>
                      <small>{member.email}</small>
                      {member.role === 'ADMIN' && <small>ผู้ดูแลระบบ</small>}
                    </td>
                    <td>{member.deletedAt ? 'ลบแล้ว' : member.isActive ? 'ใช้งานได้' : 'ถูกบล็อก'}</td>
                    <td>{number(member._count.submissions)} ครั้ง</td>
                    <td>{number(member.usage?.graderRunCount ?? 0)} ครั้ง</td>
                    <td>
                      <Link className="text-link" to={`/admin/members/${member.id}`}>
                        ดูประวัติการใช้งาน
                      </Link>
                    </td>
                    <td>
                      <div className="member-actions">
                        <button
                          className="button secondary small"
                          disabled={busy || member.role === 'ADMIN' || !!member.deletedAt}
                          onClick={() => void change(member)}
                        >
                          {member.isActive ? 'บล็อก' : 'ปลดบล็อก'}
                        </button>
                        <button
                          className="button secondary small"
                          disabled={busy || member.role === 'ADMIN' || !!member.deletedAt}
                          onClick={() => void change(member, true)}
                        >
                          ลบสมาชิก
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error && <Empty title="ไม่พบสมาชิก" />
        )}
        <div className="panel-foot">
          <button
            className="button secondary"
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            ก่อนหน้า
          </button>{' '}
          หน้า {page} · {number(data?.total ?? 0)} คน{' '}
          <button
            className="button secondary"
            disabled={!data || page * data.pageSize >= data.total || loading}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </button>
        </div>
      </section>
    </div>
  );
}
export function MemberHistory() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<{
    user: Member;
    items: Activity[];
    total: number;
    pageSize: number;
  }>(`/members/${id}/history?page=${page}`);
  return (
    <div className="page">
      <Link className="back-link" to="/admin/members">
        กลับไปรายการสมาชิก
      </Link>
      <Heading eyebrow="MEMBER ACTIVITY" title={data?.user.displayName ?? 'ประวัติการใช้งาน'}>
        {data?.user.email} · ประวัติ IP ย้อนหลัง 90 วัน
      </Heading>
      <ErrorBox error={error} retry={reload} />
      {data && (
        <>
          <div className="stats-grid">
            {[
              ['เข้าสู่ระบบ', data.user.usage?.loginCount ?? 0],
              ['รัน Playground', data.user.usage?.playgroundCount ?? 0],
              ['เรียกตัวตรวจทั้งหมด', data.user.usage?.graderRunCount ?? 0],
            ].map(([label, count]) => (
              <div className="stat-card" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>
                    {number(count)} <small>ครั้ง</small>
                  </strong>
                </div>
              </div>
            ))}
          </div>
          <p className="muted">
            ตัวนับเริ่มตั้งแต่เปิดระบบบันทึกการใช้งาน การตรวจคำตอบนับการเรียกตัวตรวจจริงต่อเทส ส่วน Playground
            นับต่อการรัน รวมการเรียกที่ไม่สำเร็จ
          </p>
          <p className="muted">
            ยอมรับเงื่อนไข:{' '}
            {data.user.privacyAcceptedAt ? dateTime(data.user.privacyAcceptedAt) : 'ยังไม่ได้ยอมรับ'}
          </p>
        </>
      )}
      <section className="panel">
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>วันเวลา</th>
                  <th>การใช้งาน</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{dateTime(row.createdAt)}</td>
                    <td>{eventNames[row.kind]}</td>
                    <td>
                      <code>{row.ip ?? 'ไม่ทราบ'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error && <Empty title="ยังไม่มีประวัติในช่วง 90 วัน" />
        )}
        <div className="panel-foot">
          <button
            className="button secondary"
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            ก่อนหน้า
          </button>{' '}
          หน้า {page}{' '}
          <button
            className="button secondary"
            disabled={!data || page * data.pageSize >= data.total || loading}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </button>
        </div>
      </section>
    </div>
  );
}
