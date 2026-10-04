import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Cpu, ChevronLeft, RefreshCw } from 'lucide-react';
import { api, message } from '../lib/api';
import { useResource, dateTime, duration, languageName, number } from '../lib/hooks';
import { Badge, Empty, ErrorBox, Heading, Loading } from '../components/ui';
import type { Submission } from '../types';

export function Submissions() {
  const { data, error, loading, reload } = useResource<Submission[]>('/submissions/me');
  return (
    <div className="page">
      <Heading
        eyebrow="YOUR PROGRESS"
        title="การส่งคำตอบ"
        action={
          <button className="button secondary" onClick={reload}>
            <RefreshCw size={16} />
            รีเฟรช
          </button>
        }
      >
        ติดตามผลตรวจและเรียนรู้จากคำตอบที่ผ่านมา
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
                    <th>โจทย์ / เวลาส่ง</th>
                    <th>ภาษา</th>
                    <th>ผลตรวจ</th>
                    <th>คะแนน</th>
                    <th>เวลา / หน่วยความจำ</th>
                    <th>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.problem.title}</strong>
                        <small>{dateTime(s.submittedAt)}</small>
                      </td>
                      <td>{languageName(s.language)}</td>
                      <td>
                        <Badge status={s.status} />
                      </td>
                      <td className="mono">
                        {number(s.score)} / {number(s.problem.maxScore)}
                      </td>
                      <td>
                        <span>{duration(s.executionTimeMs)}</span>
                        <small>{duration(s.memoryUsedKb, 'KB')}</small>
                      </td>
                      <td>
                        <Link className="text-link" to={`/submissions/${s.id}`}>
                          ดูผลตรวจ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="ยังไม่มีการส่งคำตอบ">
              เริ่มจากเลือกโจทย์ แล้วส่งโค้ดคำตอบแรกของคุณ
              <br />
              <Link className="button primary" to="/problems">
                เลือกโจทย์
              </Link>
            </Empty>
          ))
        )}
        <div className="panel-foot">แสดงการส่งคำตอบล่าสุดสูงสุด 100 ครั้ง</div>
      </section>
    </div>
  );
}
export function SubmissionDetail() {
  const { id } = useParams();
  const [data, setData] = useState<Submission>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    setData(undefined);
    setError('');
    async function poll() {
      try {
        const result = await api<Submission>(`/submissions/${id}`, { signal: controller.signal });
        if (!active) return;
        setData(result);
        setError('');
        if (['QUEUED', 'JUDGING'].includes(result.status)) timer = setTimeout(() => void poll(), 3000);
      } catch (e) {
        if (active) setError(message(e));
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [id, revision]);
  const pending = data && ['QUEUED', 'JUDGING'].includes(data.status);
  return (
    <div className="page">
      <Link className="back-link" to="/submissions">
        <ChevronLeft size={17} />
        การส่งคำตอบ
      </Link>
      <ErrorBox error={error} retry={() => setRevision((n) => n + 1)} />
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          <Heading
            eyebrow="SUBMISSION RESULT"
            title={data.problem.title}
            action={<Badge status={data.status} />}
          >
            {languageName(data.language)} · {dateTime(data.submittedAt)}
          </Heading>
          {pending && (
            <div className="notice" role="status">
              <RefreshCw className="spin" size={18} />
              กำลังตรวจคำตอบ หน้านี้จะอัปเดตผลให้อัตโนมัติ
            </div>
          )}
          {data.status === 'SYSTEM_ERROR' && (
            <ErrorBox error="ระบบตรวจคำตอบขัดข้อง กรุณาติดต่อผู้ดูแลระบบ หรือลองส่งคำตอบอีกครั้งภายหลัง" />
          )}
          <div className="stats-grid">
            <div className="stat-card">
              <CheckCircle2 className="green-text" />
              <div>
                <span>คะแนนที่ได้</span>
                <strong>
                  {pending ? '—' : number(data.score)}
                  <small>/ {number(data.problem.maxScore)}</small>
                </strong>
              </div>
            </div>
            <div className="stat-card">
              <Clock3 />
              <div>
                <span>เวลารวม</span>
                <strong>{duration(data.executionTimeMs)}</strong>
              </div>
            </div>
            <div className="stat-card">
              <Cpu />
              <div>
                <span>หน่วยความจำสูงสุด</span>
                <strong>{duration(data.memoryUsedKb, 'KB')}</strong>
              </div>
            </div>
          </div>
          <section className="panel">
            <div className="panel-title">
              <h2>ผลตรวจรายเทสเคส</h2>
              <span>
                {data.passedCount} / {data.totalCount} เทสผ่าน
              </span>
            </div>
            {data.results?.length ? (
              <div className="test-results">
                {data.results.map((r) => (
                  <div className="test-result" key={r.id}>
                    <div className="test-summary">
                      <strong>{r.name}</strong>
                      <Badge status={r.status} />
                      <span>{number(r.score)} คะแนน</span>
                      <span className="muted">
                        {duration(r.executionTimeMs)} · {duration(r.memoryUsedKb, 'KB')}
                      </span>
                    </div>
                    {(r.actualOutput || r.errorOutput) && (
                      <details>
                        <summary>ดู output</summary>
                        {r.actualOutput && <pre>{r.actualOutput}</pre>}
                        {r.errorOutput && <pre className="error-output">{r.errorOutput}</pre>}
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty title={pending ? 'กำลังรอผลตรวจ' : 'ยังไม่มีผลรายเทสเคส'} />
            )}
          </section>
          {data.compilerOutput && (
            <section className="panel code-output">
              <h2>ข้อความจาก Compiler</h2>
              <pre>{data.compilerOutput}</pre>
            </section>
          )}
          {data.sourceCode && (
            <details className="panel code-output">
              <summary>โค้ดที่ส่ง · {languageName(data.language)}</summary>
              <pre>{data.sourceCode}</pre>
            </details>
          )}
          <Link
            className="button primary"
            to={`/problems/${data.problem.id}${data.competitionId ? `?competitionId=${data.competitionId}` : ''}`}
          >
            กลับไปแก้คำตอบ
          </Link>
        </>
      )}
    </div>
  );
}
