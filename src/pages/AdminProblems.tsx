import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, Upload, Trash2, Pencil, ChevronLeft, Eye } from 'lucide-react';
import { api, json, message } from '../lib/api';
import { useResource, number } from '../lib/hooks';
import { Badge, Difficulty, Empty, ErrorBox, Field, Heading, Loading } from '../components/ui';
import type { Language, Problem } from '../types';

export function AdminProblems() {
  const { data, loading, error, reload } = useResource<Problem[]>('/problems');
  return (
    <div className="page">
      <Heading
        eyebrow="ADMIN / PROBLEMS"
        title="จัดการโจทย์"
        action={
          <Link className="button primary" to="/admin/problems/new">
            <Plus size={18} />
            เพิ่มโจทย์
          </Link>
        }
      >
        สร้างโจทย์ กำหนดคะแนน และเตรียมชุดทดสอบ
      </Heading>
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
                    <th>โจทย์</th>
                    <th>ระดับ</th>
                    <th>คะแนนเต็ม</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        <small>{p.slug}</small>
                      </td>
                      <td>
                        <Difficulty value={p.difficulty} />
                      </td>
                      <td>{number(p.maxScore)}</td>
                      <td>
                        <Badge status={p.status} />
                      </td>
                      <td>
                        <Link className="text-link" to={`/admin/problems/${p.id}`}>
                          <Pencil size={15} />
                          แก้ไข / เทสเคส
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="เริ่มสร้างโจทย์แรกของคุณ">เพิ่มเนื้อหาโจทย์ แล้วอัปโหลดไฟล์ .in และ .sol</Empty>
          ))
        )}
      </section>
    </div>
  );
}
export function AdminProblemEditor() {
  const { id } = useParams();
  return id ? <ExistingProblem id={id} /> : <ProblemEditor />;
}
function ExistingProblem({ id }: { id: string }) {
  const { data, loading, error, reload } = useResource<Problem>(`/problems/${id}`);
  if (loading) return <Loading />;
  if (!data)
    return (
      <div className="page">
        <ErrorBox error={error} retry={reload} />
      </div>
    );
  return <ProblemEditor key={id} problem={data} reload={reload} />;
}
function ProblemEditor({ problem, reload }: { problem?: Problem; reload?: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [languages, setLanguages] = useState<Language[]>(problem?.allowedLanguages || ['CPP', 'PYTHON']);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    if (!languages.length) {
      setError('เลือกภาษาอย่างน้อย 1 ภาษา');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    const payload = {
      slug: String(f.get('slug')).trim(),
      title: String(f.get('title')).trim(),
      statement: String(f.get('statement')).trim(),
      inputDescription: String(f.get('inputDescription')),
      outputDescription: String(f.get('outputDescription')),
      constraints: String(f.get('constraints')),
      difficulty: Number(f.get('difficulty')),
      allowedLanguages: languages,
      timeLimitMs: Number(f.get('timeLimitMs')),
      memoryLimitMb: Number(f.get('memoryLimitMb')),
      maxScore: Number(f.get('maxScore')),
    };
    try {
      const saved = await api<Problem>(
        problem ? `/problems/${problem.id}` : '/problems',
        json(problem ? 'PATCH' : 'POST', payload),
      );
      if (!problem) navigate(`/admin/problems/${saved.id}`, { replace: true });
      else {
        setSuccess('บันทึกโจทย์แล้ว');
        reload?.();
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(status: Problem['status']) {
    if (!problem || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/problems/${problem.id}/status`, json('PATCH', { status }));
      reload?.();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <Link className="back-link" to="/admin/problems">
        <ChevronLeft size={17} />
        จัดการโจทย์
      </Link>
      <Heading
        eyebrow="PROBLEM EDITOR"
        title={problem ? 'แก้ไขโจทย์' : 'เพิ่มโจทย์ใหม่'}
        action={problem && <Badge status={problem.status} />}
      >
        บันทึกเนื้อหา แล้วเพิ่มเทสเคสให้คะแนนรวมตรงกับคะแนนเต็ม
      </Heading>
      <ErrorBox error={error} />
      {success && (
        <div className="notice" role="status">
          {success}
        </div>
      )}
      <form onSubmit={(e) => void save(e)} className="problem-form">
        <section className="panel form-panel">
          <h2>รายละเอียดโจทย์</h2>
          <div className="form-row">
            <Field label="ชื่อโจทย์">
              <input
                name="title"
                required
                maxLength={191}
                defaultValue={problem?.title}
                placeholder="เช่น ผลรวมของจำนวนเต็ม"
              />
            </Field>
            <Field label="รหัสโจทย์" hint="ตัวพิมพ์เล็ก ตัวเลข และขีดกลาง เช่น a-plus-b">
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={191}
                defaultValue={problem?.slug}
                placeholder="a-plus-b"
              />
            </Field>
          </div>
          <Field label="เนื้อหาโจทย์" hint="รองรับ Markdown">
            <textarea
              name="statement"
              required
              rows={9}
              defaultValue={problem?.statement}
              placeholder="อธิบายสิ่งที่ผู้เรียนต้องเขียนโปรแกรม…"
            />
          </Field>
          <div className="form-row">
            <Field label="รูปแบบข้อมูลนำเข้า">
              <textarea name="inputDescription" rows={4} defaultValue={problem?.inputDescription} />
            </Field>
            <Field label="รูปแบบข้อมูลส่งออก">
              <textarea name="outputDescription" rows={4} defaultValue={problem?.outputDescription} />
            </Field>
          </div>
          <Field label="ข้อจำกัดของข้อมูล">
            <textarea
              name="constraints"
              rows={3}
              defaultValue={problem?.constraints}
              placeholder="เช่น 1 ≤ N ≤ 100,000"
            />
          </Field>
        </section>
        <section className="panel form-panel">
          <h2>เงื่อนไขและคะแนน</h2>
          <div className="form-row four">
            <Field label="ระดับความยาก">
              <select name="difficulty" defaultValue={problem?.difficulty || 1}>
                {['เริ่มต้น', 'พื้นฐาน', 'ปานกลาง', 'ท้าทาย', 'ขั้นสูง'].map((s, i) => (
                  <option key={s} value={i + 1}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time Limit (ms)">
              <input
                type="number"
                name="timeLimitMs"
                min={100}
                max={60000}
                step={1}
                required
                defaultValue={problem?.timeLimitMs ?? 1000}
              />
            </Field>
            <Field label="Memory Limit (MB)">
              <input
                type="number"
                name="memoryLimitMb"
                min={16}
                max={2048}
                step={1}
                required
                defaultValue={problem?.memoryLimitMb ?? 128}
              />
            </Field>
            <Field label="คะแนนเต็ม">
              <input
                type="number"
                name="maxScore"
                min={0.01}
                max={999999.99}
                step={0.01}
                required
                defaultValue={problem?.maxScore ?? 100}
              />
            </Field>
          </div>
          <fieldset>
            <legend>ภาษาที่อนุญาต</legend>
            <div className="checkbox-row">
              {(['CPP', 'PYTHON'] as Language[]).map((l) => (
                <label key={l}>
                  <input
                    type="checkbox"
                    checked={languages.includes(l)}
                    onChange={(e) =>
                      setLanguages(e.target.checked ? [...languages, l] : languages.filter((v) => v !== l))
                    }
                  />
                  {l === 'CPP' ? 'C++' : 'Python'}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              <Save size={17} />
              {busy ? 'กำลังบันทึก…' : 'บันทึกโจทย์'}
            </button>
          </div>
        </section>
      </form>
      {problem && (
        <>
          <TestCaseEditor problem={problem} reload={reload!} />
          <section className="panel publish-panel">
            <div>
              <h2>การเผยแพร่</h2>
              <p>ต้องมีเทสเคสอย่างน้อย 1 ชุด และคะแนนรวมเท่ากับ {number(problem.maxScore)} คะแนน</p>
            </div>
            <div className="button-row">
              <Link className="button secondary" to={`/problems/${problem.id}`}>
                <Eye size={16} />
                ดูโจทย์
              </Link>
              {problem.status !== 'PUBLISHED' && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void changeStatus('PUBLISHED')}
                >
                  เผยแพร่โจทย์
                </button>
              )}
              {problem.status === 'PUBLISHED' && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void changeStatus('DRAFT')}
                >
                  ปิดเผยแพร่
                </button>
              )}
              {problem.status !== 'ARCHIVED' && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void changeStatus('ARCHIVED')}
                >
                  เก็บถาวร
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
function TestCaseEditor({ problem, reload }: { problem: Problem; reload: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const total = (problem.testCases || []).reduce((sum, t) => sum + Number(t.score || 0), 0);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set('isSample', data.has('isSample') ? 'true' : 'false');
    for (const [field, ext] of [
      ['inputFile', '.in'],
      ['solutionFile', '.sol'],
    ]) {
      const file = data.get(field) as File;
      if (!file?.name.toLowerCase().endsWith(ext) || file.size > 2 * 1024 * 1024) {
        setError(`ไฟล์ ${ext} ต้องมีขนาดไม่เกิน 2 MB`);
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      await api(`/problems/${problem.id}/test-cases`, { method: 'POST', body: data });
      form.reset();
      reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm('ลบเทสเคสนี้? เทสเคสที่มีผลตรวจแล้วอาจไม่สามารถลบได้')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/problems/${problem.id}/test-cases/${id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-panel">
      <div className="panel-title flush">
        <h2>ชุดทดสอบ / Test cases</h2>
        <span className={Math.abs(total - Number(problem.maxScore)) < 0.001 ? 'green-text' : 'amber-text'}>
          {number(total)} / {number(problem.maxScore)} คะแนน
        </span>
      </div>
      <ErrorBox error={error} />
      {problem.testCases?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>ชื่อ</th>
                <th>การแสดงผล</th>
                <th>คะแนน</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {problem.testCases.map((t) => (
                <tr key={t.id}>
                  <td>{t.position}</td>
                  <td>{t.name}</td>
                  <td>{t.isSample ? 'ตัวอย่างเผยแพร่' : 'เทสลับ'}</td>
                  <td>{number(t.score || 0)}</td>
                  <td>
                    <button
                      className="icon-button danger"
                      disabled={busy}
                      onClick={() => void remove(t.id)}
                      aria-label={`ลบ ${t.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">ยังไม่มีเทสเคส เพิ่มคู่ไฟล์ด้านล่างเพื่อเริ่มต้น</p>
      )}
      <form className="upload-form" onSubmit={(e) => void upload(e)}>
        <div className="form-row">
          <Field label="ชื่อเทสเคส">
            <input name="name" required placeholder="เช่น จำนวนเต็มบวก" maxLength={191} />
          </Field>
          <Field label="ลำดับ">
            <input
              name="position"
              type="number"
              required
              min={1}
              step={1}
              defaultValue={Math.max(0, ...(problem.testCases || []).map((t) => t.position)) + 1}
            />
          </Field>
          <Field label="คะแนนเทสนี้">
            <input
              name="score"
              type="number"
              required
              min={0.01}
              max={999999.99}
              step={0.01}
              defaultValue={Math.max(0.01, Number(problem.maxScore) - total)}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="ไฟล์ข้อมูลนำเข้า (.in)" hint="UTF-8 ขนาดไม่เกิน 2 MB">
            <input name="inputFile" type="file" accept=".in" required />
          </Field>
          <Field label="ไฟล์คำตอบ (.sol)" hint="UTF-8 ขนาดไม่เกิน 2 MB">
            <input name="solutionFile" type="file" accept=".sol" required />
          </Field>
        </div>
        <label className="checkbox-label">
          <input name="isSample" type="checkbox" />
          แสดงเป็นตัวอย่างให้ผู้เรียนเห็น
        </label>
        <button className="button secondary" disabled={busy}>
          <Upload size={17} />
          {busy ? 'กำลังอัปโหลด…' : 'เพิ่มเทสเคส'}
        </button>
      </form>
    </section>
  );
}
