import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useResource, dateTime, duration, languageName, number } from '../lib/hooks';
import { api, json, message } from '../lib/api';
import { Badge, Empty, ErrorBox, Heading, Loading } from '../components/ui';
import type { Problem, Submission, User } from '../types';

type ProblemInfo = Pick<Problem, 'id' | 'slug' | 'title' | 'maxScore'>;
type Summary = {
  problem: ProblemInfo;
  submissionCount: number;
  userCount: number;
  bestScore: number;
  lastSubmittedAt: string;
};
type Respondent = {
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  bestScore: number;
  submissionCount: number;
  lastSubmittedAt: string;
};
type History = {
  problem: ProblemInfo;
  user: Respondent['user'];
  items: Submission[];
  total: number;
  page: number;
  pageSize: number;
};

function ResetScores({
  problemId,
  userId,
  label,
  reload,
}: {
  problemId: string;
  userId?: string;
  label: string;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function reset() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ resetCount: number }>(`/submissions/admin/problems/${problemId}/reset`, {
        ...json('POST', userId ? { userId } : {}),
        confirmation: `รีเซ็ตคะแนนเดิม${userId ? 'ของผู้เรียนคนนี้ในโจทย์นี้' : 'ของผู้เรียนทุกคนในโจทย์นี้'}? คะแนนเดิมจะไม่นับในอันดับ ประวัติและโค้ดยังคงอยู่ การส่งใหม่จะได้คะแนนตามปกติ`,
      });
      setNotice(`รีเซ็ตคะแนน ${number(result.resetCount)} คำตอบแล้ว`);
      reload();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button secondary" disabled={busy} onClick={() => void reset()}>
        {busy ? 'กำลังรีเซ็ต…' : label}
      </button>
      <ErrorBox error={error} />
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}

export function SubmissionOverview({ admin = false }: { admin?: boolean }) {
  const { data, error, loading, reload } = useResource<Summary[]>(
    `/submissions/${admin ? 'admin' : 'me'}/problems`,
  );
  const base = admin ? '/admin/submissions' : '/submissions';
  return (
    <div className="page">
      <Heading
        eyebrow={admin ? 'ADMIN SUBMISSIONS' : 'YOUR PROGRESS'}
        title={admin ? 'คำตอบของผู้เรียน' : 'การส่งคำตอบ'}
        action={
          <button className="button secondary" onClick={reload}>
            รีเฟรช
          </button>
        }
      >
        เลือกโจทย์เพื่อดู{admin ? 'อันดับผู้ตอบและประวัติการส่ง' : 'ประวัติการส่งคำตอบ'}
      </Heading>
      <section className="panel">
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Loading />
        ) : !!data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>โจทย์</th>
                  {admin && <th>ผู้ตอบ</th>}
                  <th>ส่งทั้งหมด</th>
                  <th>คะแนนสูงสุด</th>
                  <th>ส่งล่าสุด</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.problem.id}>
                    <td>
                      <strong>
                        <Link to={`${base}/problems/${row.problem.id}`}>{row.problem.title}</Link>
                      </strong>
                      <small>{row.problem.slug}</small>
                    </td>
                    {admin && <td>{number(row.userCount)} คน</td>}
                    <td>{number(row.submissionCount)} ครั้ง</td>
                    <td>
                      {number(row.bestScore)} / {number(row.problem.maxScore)}
                    </td>
                    <td>{dateTime(row.lastSubmittedAt)}</td>
                    <td>
                      <Link className="text-link" to={`${base}/problems/${row.problem.id}`}>
                        {admin ? 'ดูผู้ตอบ' : 'ดูประวัติ'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error && <Empty title="ยังไม่มีการส่งคำตอบ" />
        )}
      </section>
    </div>
  );
}

export function AdminRespondents() {
  const { problemId } = useParams();
  const { data, error, loading, reload } = useResource<{ problem: ProblemInfo; respondents: Respondent[] }>(
    `/submissions/admin/problems/${problemId}`,
  );
  return (
    <div className="page">
      <Link className="back-link" to="/admin/submissions">
        กลับไปรายการโจทย์
      </Link>
      <Heading
        eyebrow="RESPONDENTS"
        title={data?.problem.title ?? 'ผู้ตอบโจทย์'}
        action={<ResetScores problemId={problemId!} label="รีเซ็ตคะแนนทั้งข้อ" reload={reload} />}
      >
        เรียงผู้ตอบตามคะแนนสูงสุด
      </Heading>
      <section className="panel">
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Loading />
        ) : data?.respondents.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>อันดับ</th>
                  <th>ผู้ตอบ</th>
                  <th>คะแนนสูงสุด</th>
                  <th>ส่งทั้งหมด</th>
                  <th>ประวัติ / โค้ด</th>
                  <th>จัดการคะแนน</th>
                </tr>
              </thead>
              <tbody>
                {data.respondents.map((row, index) => (
                  <tr key={row.user.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{row.user.displayName}</strong>
                    </td>
                    <td>
                      {number(row.bestScore)} / {number(data.problem.maxScore)}
                    </td>
                    <td>{number(row.submissionCount)} ครั้ง</td>
                    <td>
                      <Link
                        className="text-link"
                        to={`/admin/submissions/problems/${problemId}/users/${row.user.id}`}
                      >
                        ดูประวัติและโค้ด
                      </Link>
                    </td>
                    <td>
                      <ResetScores
                        problemId={problemId!}
                        userId={row.user.id}
                        label={`รีเซ็ตคะแนน ${row.user.displayName}`}
                        reload={reload}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error && <Empty title="ยังไม่มีผู้ตอบ" />
        )}
      </section>
    </div>
  );
}

export function SubmissionHistory({ admin = false }: { admin?: boolean }) {
  const { problemId, userId } = useParams();
  const [page, setPage] = useState(1);
  const base = admin
    ? `/admin/submissions/problems/${problemId}/users/${userId}`
    : `/submissions/problems/${problemId}`;
  const path = admin
    ? `/submissions/admin/problems/${problemId}/users/${userId}`
    : `/submissions/me/problems/${problemId}`;
  const { data, error, loading, reload } = useResource<History>(`${path}?page=${page}`);
  return (
    <div className="page">
      <Link className="back-link" to={admin ? `/admin/submissions/problems/${problemId}` : '/submissions'}>
        กลับไป{admin ? 'รายชื่อผู้ตอบ' : 'รายการโจทย์'}
      </Link>
      <Heading
        eyebrow="SUBMISSION HISTORY"
        title={data?.problem.title ?? 'ประวัติการส่ง'}
        action={
          admin && (
            <ResetScores
              problemId={problemId!}
              userId={userId}
              label="รีเซ็ตคะแนนผู้เรียนในข้อนี้"
              reload={reload}
            />
          )
        }
      >
        {data?.user.displayName} · ประวัติการส่งทั้งหมด {number(data?.total ?? 0)} ครั้ง
      </Heading>
      <section className="panel">
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>เวลาส่ง</th>
                  <th>ภาษา</th>
                  <th>ผลตรวจ</th>
                  <th>คะแนน</th>
                  <th>เวลา / หน่วยความจำ</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {dateTime(row.submittedAt)}
                      {row.competitionId && <small>การแข่งขัน</small>}
                    </td>
                    <td>{languageName(row.language)}</td>
                    <td>
                      <Badge status={row.status} />
                      {row.scoreResetAt && <small>คะแนนถูกรีเซ็ต</small>}
                    </td>
                    <td>
                      {number(row.score)} / {number(data.problem.maxScore)}
                    </td>
                    <td>
                      {duration(row.executionTimeMs)}
                      <small>{duration(row.memoryUsedKb, 'KB')}</small>
                    </td>
                    <td>
                      <Link className="text-link" to={admin ? `${base}/${row.id}` : `/submissions/${row.id}`}>
                        ดูผลและโค้ด
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error && <Empty title="ยังไม่มีการส่งคำตอบ" />
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
