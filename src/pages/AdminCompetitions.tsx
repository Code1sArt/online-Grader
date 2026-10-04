import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trophy } from 'lucide-react';
import { api, json, message } from '../lib/api';
import { useResource, dateTime, number } from '../lib/hooks';
import { Badge, Empty, ErrorBox, Field, Heading, Loading } from '../components/ui';
import type { Competition, Problem } from '../types';

export function AdminCompetitions() {
  const { data, loading, error, reload } = useResource<Competition[]>('/competitions');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  async function status(id: string, status: Competition['status']) {
    setBusy(true);
    setActionError('');
    try {
      await api(`/competitions/${id}/status`, json('PATCH', { status }));
      reload();
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <Heading
        eyebrow="ADMIN / COMPETITIONS"
        title="จัดการแข่งขัน"
        action={
          <Link className="button primary" to="/admin/competitions/new">
            <Plus size={18} />
            สร้างการแข่งขัน
          </Link>
        }
      >
        กำหนดโจทย์ น้ำหนักคะแนน และช่วงเวลาแข่งขัน
      </Heading>
      <ErrorBox error={actionError} />
      <section className="panel">
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Loading />
        ) : (
          !error &&
          (data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>การแข่งขัน</th>
                    <th>เริ่ม / สิ้นสุด</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link className="problem-title" to={`/competitions/${c.id}`}>
                          {c.title}
                        </Link>
                        <small>
                          {c._count?.problems ?? 0} โจทย์ · {c._count?.participants ?? 0} คน
                        </small>
                      </td>
                      <td>
                        <span>{dateTime(c.startsAt)}</span>
                        <small>{dateTime(c.endsAt)}</small>
                      </td>
                      <td>
                        <Badge status={c.status} />
                      </td>
                      <td>
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() => void status(c.id, c.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED')}
                        >
                          {c.status === 'PUBLISHED' ? 'ปิดการแข่งขัน' : 'เผยแพร่'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="ยังไม่มีการแข่งขัน">สร้างสนามแข่งขันแรกและเลือกโจทย์จากคลังของคุณ</Empty>
          ))
        )}
      </section>
    </div>
  );
}
export function CreateCompetition() {
  const { data, error, loading, reload } = useResource<Problem[]>('/problems');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const problems = (data || []).filter((p) => p.status === 'PUBLISHED');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const start = new Date(String(form.get('startsAt')));
    const end = new Date(String(form.get('endsAt')));
    if (end <= start) {
      setFormError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
      return;
    }
    if (!Object.keys(selected).length) {
      setFormError('เลือกโจทย์อย่างน้อย 1 ข้อ');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      await api(
        '/competitions',
        json('POST', {
          title: String(form.get('title')).trim(),
          description: String(form.get('description')),
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          problems: Object.entries(selected).map(([problemId, score]) => ({ problemId, score })),
        }),
      );
      navigate('/admin/competitions');
    } catch (e) {
      setFormError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <Heading eyebrow="NEW COMPETITION" title="สร้างการแข่งขัน">
        บันทึกเป็นฉบับร่าง แล้วเผยแพร่เมื่อพร้อมรับสมัคร
      </Heading>
      <ErrorBox error={formError} />
      <form onSubmit={(e) => void submit(e)}>
        <section className="panel form-panel">
          <h2>รายละเอียดการแข่งขัน</h2>
          <Field label="ชื่อการแข่งขัน">
            <input name="title" required maxLength={191} placeholder="เช่น NR Coding Challenge #1" />
          </Field>
          <Field label="รายละเอียด">
            <textarea name="description" rows={3} />
          </Field>
          <div className="form-row">
            <Field label="เวลาเริ่ม (เวลาท้องถิ่นของอุปกรณ์)">
              <input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="เวลาสิ้นสุด (เวลาท้องถิ่นของอุปกรณ์)">
              <input name="endsAt" type="datetime-local" required />
            </Field>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="panel-title flush">
            <h2>เลือกโจทย์และคะแนน</h2>
            <span>
              {Object.keys(selected).length} ข้อ ·{' '}
              {number(Object.values(selected).reduce((a, b) => a + b, 0))} คะแนน
            </span>
          </div>
          <ErrorBox error={error} retry={reload} />
          {loading ? (
            <Loading />
          ) : problems.length ? (
            <div className="competition-pick">
              {problems.map((p) => (
                <div key={p.id}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={p.id in selected}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = { ...prev };
                          if (e.target.checked) next[p.id] = Number(p.maxScore);
                          else delete next[p.id];
                          return next;
                        })
                      }
                    />
                    <span>
                      <strong>{p.title}</strong>
                      <small>{p.slug}</small>
                    </span>
                  </label>
                  {p.id in selected && (
                    <Field label={`คะแนนของ ${p.title}`}>
                      <input
                        type="number"
                        min={0.01}
                        max={999999.99}
                        step={0.01}
                        required
                        value={selected[p.id]}
                        onChange={(e) => setSelected({ ...selected, [p.id]: Number(e.target.value) })}
                      />
                    </Field>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="ยังไม่มีโจทย์ที่เผยแพร่">เผยแพร่โจทย์ก่อนเพิ่มในการแข่งขัน</Empty>
          )}
          <div className="form-actions">
            <Link className="button secondary" to="/admin/competitions">
              ยกเลิก
            </Link>
            <button className="button primary" disabled={busy || !Object.keys(selected).length}>
              <Trophy size={17} />
              {busy ? 'กำลังสร้าง…' : 'สร้างการแข่งขัน'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
