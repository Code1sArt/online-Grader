import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Cpu, ChevronLeft, RefreshCw } from 'lucide-react';
import { api, message } from '../lib/api';
import { dateTime, duration, languageName, number } from '../lib/hooks';
import { Badge, Empty, ErrorBox, Heading, Loading } from '../components/ui';
import type { Submission } from '../types';

export { SubmissionOverview as Submissions } from './SubmissionBrowser';
export function SubmissionDetail() {
  const { id, problemId, userId } = useParams();
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
      <Link
        className="back-link"
        to={
          userId
            ? `/admin/submissions/problems/${problemId}/users/${userId}`
            : data
              ? `/submissions/problems/${data.problem.id}`
              : '/submissions'
        }
      >
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
          {data.scoreResetAt && (
            <div className="notice">คะแนนของคำตอบนี้ถูกรีเซ็ตแล้ว · ประวัติและโค้ดยังคงอยู่</div>
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
          {!pending && !!data.subtaskResults?.length && (
            <section className="panel form-panel">
              <div className="panel-title flush">
                <h2>ผลตรวจราย Subtask</h2>
                <span>ผ่านครบกลุ่มจึงได้คะแนน · หยุดกลุ่มเมื่อไม่ผ่านและตรวจกลุ่มถัดไป</span>
              </div>
              <div className="subtask-cards">
                {data.subtaskResults.map((group) => (
                  <article className="subtask-card" key={group.subtaskId}>
                    <div className="subtask-card-head">
                      <strong>{group.name}</strong>
                      <Badge status={group.status} />
                    </div>
                    {group.description && <p>{group.description}</p>}
                    <div className="subtask-result-score">
                      {number(group.score)} <small>/ {number(group.maxScore)} คะแนน</small>
                    </div>
                    <div className="subtask-result-metrics">
                      <span>
                        ตรวจ {group.executedCount ?? group.totalCount} / {group.totalCount} เทส
                        {!!group.skippedCount && ` · ข้าม ${group.skippedCount} เทสหลังไม่ผ่าน`}
                      </span>
                      <span>
                        <Clock3 size={14} /> {duration(group.executionTimeMs)} รวม
                      </span>
                      <span>
                        <Cpu size={14} /> {duration(group.memoryUsedKb, 'KB')} สูงสุด
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {!data.subtaskResults?.length && (
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
                        <span>
                          {r.subtaskId
                            ? `คะแนนรวมใน ${data.subtaskResults?.find((group) => group.subtaskId === r.subtaskId)?.name || 'subtask'}`
                            : `${number(r.score)} คะแนน`}
                        </span>
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
          )}
          {data.compilerOutput && (
            <section className="panel code-output">
              <h2>ข้อความจาก Compiler</h2>
              <pre>{data.compilerOutput}</pre>
            </section>
          )}
          {data.sourceCode && (
            <details className="panel code-output" open={userId ? true : undefined}>
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
