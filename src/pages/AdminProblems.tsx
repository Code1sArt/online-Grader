import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, Upload, Trash2, Pencil, ChevronLeft, Eye } from 'lucide-react';
import { api, json, message } from '../lib/api';
import { useResource, number } from '../lib/hooks';
import { Badge, Difficulty, Empty, ErrorBox, Field, Heading, Loading } from '../components/ui';
import type { Language, Problem, Subtask, TestCase } from '../types';

export function AdminProblems() {
  const { data, loading, error, reload } = useResource<Problem[]>('/problems');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  async function remove(problem: Problem) {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await api(`/problems/${problem.id}`, {
        method: 'DELETE',
        confirmation: `ลบโจทย์ ${problem.title} ออกจากคลังและการแข่งขัน? คะแนนข้อนี้จะไม่นับใน Home และประวัติการส่งยังคงอยู่`,
      });
      reload();
    } catch (caught) {
      setActionError(message(caught));
    } finally {
      setBusy(false);
    }
  }
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
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() => void remove(p)}
                        >
                          <Trash2 size={15} />
                          ลบโจทย์
                        </button>
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
  const [zipNotice, setZipNotice] = useState('');
  const { data, loading, error, reload } = useResource<Problem>(`/problems/${id}`);
  if (loading) return <Loading />;
  if (!data)
    return (
      <div className="page">
        <ErrorBox error={error} retry={reload} />
      </div>
    );
  return (
    <ProblemEditor
      key={id}
      problem={data}
      reload={reload}
      zipNotice={zipNotice}
      onZipImported={(count) => {
        setZipNotice(`เพิ่ม ${number(count)} เทสจาก ZIP เข้า subtask แล้ว`);
        reload();
      }}
    />
  );
}
function ProblemEditor({
  problem,
  reload,
  zipNotice,
  onZipImported,
}: {
  problem?: Problem;
  reload?: () => void;
  zipNotice?: string;
  onZipImported?: (count: number) => void;
}) {
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
      {zipNotice && (
        <div className="notice" role="status">
          {zipNotice}
        </div>
      )}
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
          <Field label="เนื้อหาโจทย์" hint="รองรับ Markdown รวมถึงตาราง">
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
              rows={6}
              defaultValue={problem?.constraints}
              placeholder={'เช่น 1 ≤ N ≤ 100,000\nกด Enter เพื่อขึ้นบรรทัดใหม่'}
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
          <SubtaskEditor problem={problem} reload={reload!} />
          <TestCaseEditor problem={problem} reload={reload!} onZipImported={onZipImported} />
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
function TestCaseEditor({
  problem,
  reload,
  onZipImported,
}: {
  problem: Problem;
  reload: () => void;
  onZipImported?: (count: number) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [subtaskId, setSubtaskId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const tests = problem.testCases || [];
  const total =
    (problem.subtasks || []).reduce((sum, group) => sum + Number(group.score), 0) +
    (problem.testCases || [])
      .filter((test) => !test.subtaskId)
      .reduce((sum, t) => sum + Number(t.score || 0), 0);
  const locked = !!problem.subtasks?.length && !problem.scoringEditable;
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set('isSample', data.has('isSample') ? 'true' : 'false');
    if (!subtaskId) data.delete('subtaskId');
    else data.set('score', '0');
    for (const [field, ext] of [
      ['inputFile', '.in'],
      ['solutionFile', '.sol'],
    ]) {
      const file = data.get(field) as File;
      if (!file?.name.toLowerCase().endsWith(ext) || file.size > 10 * 1024 * 1024) {
        setError(`ไฟล์ ${ext} ต้องมีขนาดไม่เกิน 10 MB`);
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      await api(`/problems/${problem.id}/test-cases`, { method: 'POST', body: data });
      form.reset();
      setSubtaskId('');
      reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
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
  async function setSamples(isSample: boolean) {
    if (busy || !selectedIds.length) return;
    setBusy(true);
    setError('');
    try {
      await api(
        `/problems/${problem.id}/test-cases/samples`,
        json('PATCH', { testCaseIds: selectedIds, isSample }),
      );
      setSelectedIds([]);
      reload();
    } catch (caught) {
      setError(message(caught));
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
      {!!tests.length && (
        <div className="test-case-selection">
          <span>
            เลือก {number(selectedIds.length)} / {number(tests.length)} เทส
          </span>
          <div className="button-row">
            <button
              className="button secondary"
              disabled={busy || !selectedIds.length}
              onClick={() => void setSamples(true)}
            >
              <Eye size={16} />
              ตั้งเป็นตัวอย่าง
            </button>
            <button
              className="text-button"
              disabled={busy || !selectedIds.length}
              onClick={() => void setSamples(false)}
            >
              ตั้งเป็นเทสลับ
            </button>
          </div>
        </div>
      )}
      {problem.testCases?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="เลือกเทสทั้งหมด"
                    disabled={busy}
                    checked={selectedIds.length === tests.length}
                    ref={(node) => {
                      if (node)
                        node.indeterminate = selectedIds.length > 0 && selectedIds.length < tests.length;
                    }}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? tests.map((test) => test.id) : [])
                    }
                  />
                </th>
                <th>ลำดับ</th>
                <th>ชื่อ</th>
                <th>การแสดงผล</th>
                <th>คะแนน / Subtask</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {problem.testCases.map((t) => (
                <tr key={t.id} className={selectedIds.includes(t.id) ? 'test-case-selected' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`เลือกเทส ${t.name}`}
                      disabled={busy}
                      checked={selectedIds.includes(t.id)}
                      onChange={(event) =>
                        setSelectedIds(
                          event.target.checked
                            ? [...selectedIds, t.id]
                            : selectedIds.filter((id) => id !== t.id),
                        )
                      }
                    />
                  </td>
                  <td>{t.position}</td>
                  <td>{t.name}</td>
                  <td>{t.isSample ? 'ตัวอย่างเผยแพร่' : 'เทสลับ'}</td>
                  <td>
                    <TestCaseAssignment test={t} problem={problem} reload={reload} />
                  </td>
                  <td>
                    <button
                      className="icon-button danger"
                      disabled={busy || locked}
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
      <ZipTestCaseUpload
        problem={problem}
        disabled={busy || locked}
        onBusyChange={setBusy}
        onImported={onZipImported ?? (() => reload())}
      />
      <form className="upload-form" onSubmit={(e) => void upload(e)}>
        <Field
          label="Subtask ของเทสนี้"
          hint="เทสในกลุ่มต้องผ่านทั้งหมดจึงได้คะแนน ใช้ Time / Memory Limit ของโจทย์"
        >
          <select
            name="subtaskId"
            aria-label="Subtask ของเทสนี้"
            value={subtaskId}
            onChange={(event) => setSubtaskId(event.target.value)}
            disabled={locked}
          >
            <option value="">ให้คะแนนรายเทส (แบบเดิม)</option>
            {(problem.subtasks || []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} · {number(group.score)} คะแนน
              </option>
            ))}
          </select>
        </Field>
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
          <Field
            label="คะแนนเทสนี้"
            hint={subtaskId ? 'ใช้คะแนนของ subtask แทนคะแนนรายเทส' : 'ใส่ 0 สำหรับตัวอย่างที่ไม่ให้คะแนน'}
          >
            <input
              name="score"
              aria-label="คะแนนเทสนี้"
              type="number"
              required
              min={0}
              max={999999.99}
              step={0.01}
              disabled={!!subtaskId}
              defaultValue={Math.max(0, Number(problem.maxScore) - total)}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="ไฟล์ข้อมูลนำเข้า (.in)" hint="UTF-8 ขนาดไม่เกิน 10 MB">
            <input name="inputFile" type="file" accept=".in" required />
          </Field>
          <Field label="ไฟล์คำตอบ (.sol)" hint="UTF-8 ขนาดไม่เกิน 10 MB">
            <input name="solutionFile" type="file" accept=".sol" required />
          </Field>
        </div>
        <label className="checkbox-label">
          <input name="isSample" type="checkbox" />
          แสดงเป็นตัวอย่างให้ผู้เรียนเห็น
        </label>
        <button className="button secondary" disabled={busy || locked}>
          <Upload size={17} />
          {busy ? 'กำลังอัปโหลด…' : 'เพิ่มเทสเคส'}
        </button>
      </form>
    </section>
  );
}

function SubtaskEditor({ problem, reload }: { problem: Problem; reload: () => void }) {
  const [editing, setEditing] = useState<Subtask>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const groups = problem.subtasks || [];
  const editable = problem.scoringEditable ?? problem.status === 'DRAFT';
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !editable) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api(
        `/problems/${problem.id}/subtasks${editing ? `/${editing.id}` : ''}`,
        json(editing ? 'PATCH' : 'POST', {
          name: String(values.get('name')).trim(),
          description: String(values.get('description')).trim(),
          score: Number(values.get('score')),
          position: Number(values.get('position')),
        }),
      );
      setEditing(undefined);
      reload();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  async function remove(group: Subtask) {
    if (busy || !editable) return;
    setBusy(true);
    setError('');
    try {
      await api(`/problems/${problem.id}/subtasks/${group.id}`, { method: 'DELETE' });
      reload();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-panel">
      <div className="panel-title flush">
        <h2>Subtasks / กลุ่มทดสอบ</h2>
        <span>{groups.length} กลุ่ม</span>
      </div>
      <p className="muted">
        ผ่านทุกเทสในกลุ่มจึงได้คะแนนทั้งกลุ่ม เช่น ข้อมูลเล็ก 20 คะแนน ข้อมูลกลาง 30 คะแนน ข้อมูลใหญ่ 50 คะแนน
      </p>
      {!editable && (
        <p className="subtask-notice">
          แก้กลุ่มได้เฉพาะโจทย์ฉบับร่างที่ยังไม่มีคำตอบ หากมีคำตอบแล้ว ให้สร้างโจทย์ใหม่เพื่อใช้เกณฑ์ subtask
        </p>
      )}
      <ErrorBox error={error} />
      <div className="subtask-cards">
        {groups.map((group) => {
          const count = (problem.testCases || []).filter((test) => test.subtaskId === group.id).length;
          return (
            <article className="subtask-card" key={group.id}>
              <div className="subtask-card-head">
                <strong>
                  {group.position}. {group.name}
                </strong>
                <span className="badge green">{number(group.score)} คะแนน</span>
              </div>
              <p>{group.description || 'ใช้ข้อจำกัดข้อมูลของโจทย์'}</p>
              <div className="subtask-card-foot">
                <span className={count ? 'muted' : 'amber-text'}>
                  {count} เทส{!count && ' · เพิ่มเทสก่อนเผยแพร่'}
                </span>
                <div className="button-row">
                  <button
                    className="text-button"
                    disabled={busy || !editable}
                    onClick={() => setEditing(group)}
                    aria-label={`แก้ไข subtask ${group.name}`}
                  >
                    <Pencil size={14} /> แก้ไข
                  </button>
                  <button
                    className="text-button danger"
                    disabled={busy || !editable || count > 0}
                    onClick={() => void remove(group)}
                    aria-label={`ลบ subtask ${group.name}`}
                  >
                    <Trash2 size={14} /> ลบ
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {editable && (
        <form
          key={editing?.id || 'new-subtask'}
          onSubmit={(event) => void save(event)}
          className="upload-form"
        >
          <h3>{editing ? 'แก้ไขกลุ่มทดสอบ' : 'เพิ่มกลุ่มทดสอบ'}</h3>
          <div className="form-row">
            <Field label="ชื่อ subtask">
              <input
                name="name"
                required
                maxLength={191}
                defaultValue={editing?.name}
                placeholder="เช่น ข้อมูลเล็ก"
              />
            </Field>
            <Field label="คะแนน subtask">
              <input
                name="score"
                type="number"
                required
                min={0.01}
                max={999999.99}
                step={0.01}
                defaultValue={editing ? Number(editing.score) : 20}
              />
            </Field>
            <Field label="ลำดับ subtask">
              <input
                name="position"
                type="number"
                required
                min={1}
                step={1}
                defaultValue={editing?.position ?? Math.max(0, ...groups.map((group) => group.position)) + 1}
              />
            </Field>
          </div>
          <Field
            label="เงื่อนไขข้อมูลของ subtask"
            hint="ระบุขนาดหรือเงื่อนไขข้อมูล แล้วอัปโหลดเทสที่ตรงกับเงื่อนไขนี้"
          >
            <textarea
              name="description"
              rows={2}
              maxLength={5000}
              defaultValue={editing?.description || ''}
              placeholder="เช่น 1 ≤ n ≤ 100"
            />
          </Field>
          <div className="button-row">
            <button className="button secondary" disabled={busy}>
              <Plus size={16} />
              {editing ? 'บันทึก subtask' : 'เพิ่ม subtask'}
            </button>
            {editing && (
              <button
                type="button"
                className="text-button"
                onClick={() => setEditing(undefined)}
                disabled={busy}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

function TestCaseAssignment({
  test,
  problem,
  reload,
}: {
  test: TestCase;
  problem: Problem;
  reload: () => void;
}) {
  const [subtaskId, setSubtaskId] = useState(test.subtaskId || '');
  const [score, setScore] = useState(Number(test.score || 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!problem.scoringEditable)
    return (
      <>
        {test.subtaskId
          ? problem.subtasks?.find((group) => group.id === test.subtaskId)?.name
          : `${number(test.score || 0)} คะแนน`}
      </>
    );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api(
        `/problems/${problem.id}/test-cases/${test.id}`,
        json('PATCH', { subtaskId, score: subtaskId ? 0 : score }),
      );
      reload();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="test-assignment" onSubmit={(event) => void save(event)}>
      <select
        aria-label={`Subtask ของ ${test.name}`}
        value={subtaskId}
        onChange={(event) => setSubtaskId(event.target.value)}
        disabled={busy}
      >
        <option value="">คะแนนรายเทส</option>
        {(problem.subtasks || []).map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      {!subtaskId && (
        <input
          type="number"
          aria-label={`คะแนนของ ${test.name}`}
          value={score}
          onChange={(event) => setScore(Number(event.target.value))}
          required
          min={0}
          max={999999.99}
          step={0.01}
          disabled={busy}
        />
      )}
      <button className="text-button" disabled={busy} aria-label={`บันทึกกลุ่มของ ${test.name}`}>
        <Save size={15} />
      </button>
      <ErrorBox error={error} />
    </form>
  );
}

function ZipTestCaseUpload({
  problem,
  disabled,
  onBusyChange,
  onImported,
}: {
  problem: Problem;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onImported: (count: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const groups = problem.subtasks || [];
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('zipFile') as File;
    if (!file?.name.toLowerCase().endsWith('.zip') || file.size > 20 * 1024 * 1024) {
      setError('ไฟล์ต้องเป็น .zip ขนาดไม่เกิน 20 MB');
      return;
    }
    setError('');
    setBusy(true);
    onBusyChange(true);
    try {
      const result = await api<{ count: number }>(`/problems/${problem.id}/test-cases/zip`, {
        method: 'POST',
        body: data,
        timeoutMs: 120000,
      });
      form.reset();
      onImported(result.count);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="zip-test-upload">
      <div>
        <h3>เพิ่มหลายเทสด้วย ZIP</h3>
        <p>
          จับคู่ไฟล์ชื่อเดียวกันในโฟลเดอร์เดียวกัน เช่น 01.in + 01.sol
          ระบบจะเพิ่มทุกคู่เป็นเทสลับและต่อเลขลำดับให้อัตโนมัติ
        </p>
      </div>
      {!groups.length ? (
        <p className="muted">เพิ่ม subtask ด้านบนก่อนนำเข้า ZIP</p>
      ) : (
        <form onSubmit={(event) => void upload(event)}>
          <div className="form-row">
            <Field label="Subtask สำหรับ ZIP">
              <select
                name="subtaskId"
                aria-label="Subtask สำหรับ ZIP"
                required
                defaultValue=""
                disabled={disabled || busy}
              >
                <option value="" disabled>
                  เลือก subtask
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="ไฟล์ ZIP ของชุดทดสอบ"
              hint="ZIP ≤ 20 MB · แต่ละไฟล์ ≤ 10 MB · รวมหลังแตก ≤ 50 MB · สูงสุด 500 เทส"
            >
              <input
                name="zipFile"
                type="file"
                accept=".zip,application/zip"
                required
                disabled={disabled || busy}
              />
            </Field>
          </div>
          <ErrorBox error={error} />
          <button className="button primary" disabled={disabled || busy}>
            <Upload size={17} />
            {busy ? 'กำลังตรวจและนำเข้า ZIP…' : 'นำเข้า ZIP เข้า subtask'}
          </button>
          <small>ตรวจทุกไฟล์ก่อนบันทึก หากมีข้อผิดพลาดจะไม่เพิ่มเทสจาก ZIP ชุดนี้</small>
        </form>
      )}
    </div>
  );
}
