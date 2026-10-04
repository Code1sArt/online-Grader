import { Link, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Trophy, Users, BookOpen, RefreshCw } from 'lucide-react';
import { api, json, message } from '../lib/api';
import { dateTime, number, useResource, duration } from '../lib/hooks';
import { Empty, ErrorBox, Heading, Loading } from '../components/ui';
import type { Competition, Leaderboard } from '../types';

export function competitionPhase(c: Competition, now: number) {
  return c.status === 'DRAFT'
    ? 'ฉบับร่าง'
    : c.status === 'CLOSED' || new Date(c.endsAt).getTime() <= now
      ? 'สิ้นสุดแล้ว'
      : new Date(c.startsAt).getTime() > now
        ? 'เร็ว ๆ นี้'
        : 'กำลังแข่งขัน';
}
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function Competitions() {
  const { data, loading, error, reload } = useResource<Competition[]>('/competitions');
  const now = useNow();
  return (
    <div className="page">
      <Heading eyebrow="CHALLENGE YOURSELF" title="สนามแข่งขัน">
        แก้โจทย์ให้ถูกต้อง ทำเวลาให้ดี และใช้ทรัพยากรอย่างคุ้มค่า
      </Heading>
      <div className="competition-banner">
        <Trophy size={50} strokeWidth={1.4} />
        <div>
          <h2>จากการฝึกฝน สู่สนามจริง</h2>
          <p>คะแนนความถูกต้องเป็นอันดับแรก ตามด้วยความเร็วและหน่วยความจำ</p>
        </div>
      </div>
      <ErrorBox error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : (
        !error &&
        (data?.length ? (
          <div className="competition-grid">
            {data.map((c) => (
              <Link className="competition-card panel" key={c.id} to={`/competitions/${c.id}`}>
                <div className="competition-card-top">
                  <span className="trophy-box">
                    <Trophy />
                  </span>
                  <span className={`badge ${competitionPhase(c, now) === 'กำลังแข่งขัน' ? 'green' : 'gray'}`}>
                    {competitionPhase(c, now)}
                  </span>
                </div>
                <h2>{c.title}</h2>
                <p>{c.description || 'ฝึกทักษะการแก้โจทย์ในเวลาที่กำหนด'}</p>
                <div className="competition-meta">
                  <span>
                    <CalendarDays size={16} />
                    {dateTime(c.startsAt)}
                  </span>
                  <span>
                    <BookOpen size={16} />
                    {c._count?.problems ?? 0} โจทย์
                  </span>
                  <span>
                    <Users size={16} />
                    {c._count?.participants ?? 0} คน
                  </span>
                </div>
                <div className="competition-card-foot">
                  {c.participants.length ? 'สมัครเข้าร่วมแล้ว' : 'ดูรายละเอียดการแข่งขัน'}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="panel">
            <Empty title="ยังไม่มีการแข่งขัน">กลับมาตรวจสอบอีกครั้งเมื่อผู้ดูแลเปิดสนามใหม่</Empty>
          </section>
        ))
      )}
    </div>
  );
}
export function CompetitionDetail() {
  const { id } = useParams();
  const resource = useResource<Competition>(`/competitions/${id}`);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lastPhase = useRef('');
  useEffect(() => {
    if (!resource.data) return;
    const phase = competitionPhase(resource.data, now);
    if (lastPhase.current === 'เร็ว ๆ นี้' && phase === 'กำลังแข่งขัน') resource.reload();
    lastPhase.current = phase;
  }, [resource.data, resource.reload, now]);
  if (resource.loading) return <Loading />;
  const c = resource.data;
  if (!c)
    return (
      <div className="page">
        <ErrorBox error={resource.error} retry={resource.reload} />
      </div>
    );
  const phase = competitionPhase(c, now);
  const joined = c.joined || c.participants.length > 0;
  const active = phase === 'กำลังแข่งขัน';
  const open = c.status === 'PUBLISHED' && now < new Date(c.endsAt).getTime();
  async function join() {
    setBusy(true);
    setError('');
    try {
      await api(`/competitions/${id}/join`, json('POST', {}));
      resource.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <Heading eyebrow="COMPETITION" title={c.title} action={<span className="badge green">{phase}</span>}>
        {c.description}
      </Heading>
      <div className="panel competition-detail-meta">
        <div>
          <span>เริ่มแข่งขัน</span>
          <strong>{dateTime(c.startsAt)}</strong>
        </div>
        <div>
          <span>สิ้นสุด</span>
          <strong>{dateTime(c.endsAt)}</strong>
        </div>
        <div>
          <span>สถานะของคุณ</span>
          <strong>{joined ? 'สมัครเข้าร่วมแล้ว' : 'ยังไม่ได้สมัคร'}</strong>
        </div>
        {open && !joined && (
          <button className="button primary" onClick={() => void join()} disabled={busy}>
            {busy ? 'กำลังสมัคร…' : 'สมัครเข้าร่วม'}
          </button>
        )}
      </div>
      <ErrorBox error={error} />
      <section className="panel">
        <div className="panel-title">
          <h2>โจทย์การแข่งขัน</h2>
          <span>
            {active
              ? `เหลือ ${Math.max(0, Math.ceil((new Date(c.endsAt).getTime() - now) / 60000))} นาที`
              : phase}
          </span>
        </div>
        {c.problems?.length ? (
          <div className="competition-problems">
            {c.problems.map((p, i) => (
              <div className="competition-problem" key={p.problemId}>
                <span className="problem-letter">{String.fromCharCode(65 + i)}</span>
                <div>
                  <strong>{p.problem.title}</strong>
                  <small>
                    {number(p.score)} คะแนน · {p.problem.timeLimitMs} ms · {p.problem.memoryLimitMb} MB
                  </small>
                </div>
                {active && joined ? (
                  <Link className="button secondary" to={`/problems/${p.problemId}?competitionId=${c.id}`}>
                    ทำโจทย์
                  </Link>
                ) : (
                  <span className="muted">{active ? 'สมัครก่อนทำโจทย์' : 'ส่งคำตอบได้ในช่วงแข่งขัน'}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="โจทย์จะแสดงเมื่อเริ่มการแข่งขัน" />
        )}
      </section>
      {c.status !== 'DRAFT' && <LeaderboardPanel id={c.id} />}
      <p className="muted">
        อันดับเรียงตามคะแนนรวม เวลาส่งคำตอบที่ดีที่สุด เวลาโปรแกรม และหน่วยความจำ ตามลำดับ
      </p>
    </div>
  );
}
function LeaderboardPanel({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<Leaderboard>(`/competitions/${id}/leaderboard`);
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>
          <Trophy size={20} />
          ตารางอันดับ
        </h2>
        <button className="text-button" onClick={reload}>
          <RefreshCw size={15} />
          รีเฟรช
        </button>
      </div>
      <ErrorBox error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : (
        !error &&
        (data?.entries.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>อันดับ</th>
                  <th>ผู้เข้าแข่งขัน</th>
                  <th>คะแนน</th>
                  <th>สำเร็จ</th>
                  <th>เวลาส่งคำตอบ</th>
                  <th>เวลาโปรแกรม</th>
                  <th>หน่วยความจำ</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.userId}>
                    <td>
                      <span className={`rank ${e.rank <= 3 ? 'podium' : ''}`}>{e.rank}</span>
                    </td>
                    <td>
                      <strong>{e.displayName}</strong>
                    </td>
                    <td className="mono green-text">{number(e.totalScore)}</td>
                    <td>{e.solvedCount}</td>
                    <td>
                      {duration(
                        e.completionTimeMs < 1e12 ? Math.round(e.completionTimeMs / 60000) : null,
                        'นาที',
                      )}
                    </td>
                    <td>{duration(e.executionTimeMs)}</td>
                    <td>{duration(e.memoryUsedKb, 'KB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="ยังไม่มีผู้เข้าแข่งขัน" />
        ))
      )}
    </section>
  );
}
