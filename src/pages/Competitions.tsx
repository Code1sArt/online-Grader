import { Link, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Trophy,
  Users,
  BookOpen,
  RefreshCw,
  Flag,
  Zap,
  Crown,
  Timer,
  MemoryStick,
} from 'lucide-react';
import { useAuth } from '../auth';
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
        อันดับเรียงตามคะแนนรวมมากที่สุด → เวลาโปรแกรมรวมน้อยที่สุด → หน่วยความจำรวมน้อยที่สุด
      </p>
    </div>
  );
}
type Racer = Leaderboard['entries'][number];

function RacerAvatar({ entry }: { entry: Racer }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <span className="racer-avatar">
      {entry.avatarUrl && entry.avatarUrl !== failedUrl ? (
        <img
          src={entry.avatarUrl}
          alt={`รูปโปรไฟล์ ${entry.displayName}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailedUrl(entry.avatarUrl!)}
        />
      ) : (
        <span aria-label={`รูปแทนตัว ${entry.displayName}`}>
          {Array.from(entry.displayName.trim())[0] || '?'}
        </span>
      )}
    </span>
  );
}

function LeaderboardPanel({ id }: { id: string }) {
  const { user } = useAuth();
  const { data, error, loading, reload } = useResource<Leaderboard>(`/competitions/${id}/leaderboard`);
  const entries = data?.entries ?? [];
  const leaders = entries.filter((entry) => entry.rank <= 3);
  const myEntry = entries.find((entry) => entry.userId === user?.id);
  return (
    <section className="panel speed-leaderboard" aria-labelledby="speed-title">
      <div className="speed-header">
        <div>
          <span className="speed-eyebrow">
            <Flag size={14} /> THE SPEED ARENA
          </span>
          <h2 id="speed-title">
            เจ้าแห่งความเร็ว <Zap size={26} fill="currentColor" />
          </h2>
          <p>ทุกคะแนนมีความหมาย ทุกวินาทีมีโอกาสแซง</p>
        </div>
        <button className="speed-refresh" onClick={reload} disabled={loading}>
          <RefreshCw size={15} /> รีเฟรชอันดับ
        </button>
      </div>
      <div className="speed-race-info">
        <span>
          <Users size={15} /> {number(entries.length)} ผู้เข้าแข่งขัน
        </span>
        {myEntry && (
          <span className="speed-my-rank">
            อันดับของคุณ <strong>#{myEntry.rank}</strong>
          </span>
        )}
        {data?.generatedAt && <span>อัปเดต {dateTime(data.generatedAt)}</span>}
      </div>
      <ErrorBox error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : (
        !error &&
        (entries.length ? (
          <>
            <div className="speed-podium" aria-label="ผู้เข้าแข่งขัน 3 อันดับแรก">
              {leaders.map((entry) => (
                <article className={`speed-podium-card place-${entry.rank}`} key={entry.userId}>
                  <span className="speed-place-label">
                    {entry.rank === 1 ? (
                      <>
                        <Crown size={17} /> ผู้นำสนาม
                      </>
                    ) : (
                      `อันดับ ${entry.rank}`
                    )}
                  </span>
                  <div className="speed-podium-avatar">
                    <RacerAvatar entry={entry} />
                    <span className="speed-position">{entry.rank}</span>
                  </div>
                  <h3>{entry.displayName}</h3>
                  {entry.userId === user?.id && <span className="speed-you">คุณ</span>}
                  <div className="speed-podium-score">
                    {number(entry.totalScore)} <small>คะแนน</small>
                  </div>
                  <div className="speed-podium-time">
                    <Timer size={14} /> {duration(entry.executionTimeMs)}
                  </div>
                  <div className="speed-podium-time">
                    <MemoryStick size={14} /> {duration(entry.memoryUsedKb, 'KB')}
                  </div>
                  <div className="speed-podium-base" aria-hidden="true">
                    0{entry.rank}
                  </div>
                </article>
              ))}
            </div>
            <div className="speed-grid-heading">
              <span>
                <Flag size={15} /> ตารางอันดับ
              </span>
              <small>คะแนนมาก → รันเร็ว → ใช้หน่วยความจำน้อย</small>
            </div>
            <div className="table-scroll">
              <table className="speed-table">
                <caption className="sr-only">ตารางอันดับผู้เข้าแข่งขัน เรียงตามอันดับจากระบบ</caption>
                <thead>
                  <tr>
                    <th>อันดับ</th>
                    <th>ผู้เข้าแข่งขัน</th>
                    <th>คะแนน</th>
                    <th>สำเร็จ</th>
                    <th>เวลาโปรแกรมรวม</th>
                    <th>หน่วยความจำรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.userId} className={entry.userId === user?.id ? 'speed-current-user' : ''}>
                      <td>
                        <span className={`speed-table-rank place-${entry.rank}`}>#{entry.rank}</span>
                      </td>
                      <td>
                        <div className="speed-racer">
                          <RacerAvatar entry={entry} />
                          <strong>{entry.displayName}</strong>
                          {entry.userId === user?.id && <span className="speed-you">คุณ</span>}
                        </div>
                      </td>
                      <td className="mono speed-score">{number(entry.totalScore)}</td>
                      <td>{entry.solvedCount} โจทย์</td>
                      <td className="mono">{duration(entry.executionTimeMs)}</td>
                      <td className="mono">{duration(entry.memoryUsedKb, 'KB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty title="สนามพร้อมแล้ว รอผู้ท้าชิงคนแรก">
            สมัครเข้าร่วม แล้วเริ่มเก็บคะแนนเพื่อชิงตำแหน่งผู้นำ
          </Empty>
        ))
      )}
    </section>
  );
}
