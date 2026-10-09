import { useState } from 'react';
import { Crown, RefreshCw, Trophy, Users } from 'lucide-react';
import { useAuth } from '../auth';
import { useResource, number, dateTime } from '../lib/hooks';
import { Empty, ErrorBox, Loading } from '../components/ui';
import { RacerAvatar } from './Competitions';
type Entry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  rank: number;
};
export function Home() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource<{ entries: Entry[]; generatedAt: string }>(
    '/leaderboard',
  );
  const [page, setPage] = useState(1);
  const entries = data?.entries ?? [];
  const mine = entries.find((row) => row.userId === user?.id);
  return (
    <div className="page">
      <section className="panel speed-leaderboard home-leaderboard" aria-labelledby="home-leaderboard-title">
        <div className="speed-header">
          <div>
            <span className="speed-eyebrow">
              <Crown size={16} /> NR GRADER HALL OF FAME
            </span>
            <h1 id="home-leaderboard-title">
              อันดับคะแนนรวม <Trophy size={28} />
            </h1>
            <p>ทุกโจทย์ที่ผ่าน คืออีกก้าวสู่จุดสูงสุด</p>
          </div>
          <button
            className="speed-refresh"
            disabled={loading}
            onClick={() => {
              setPage(1);
              reload();
            }}
          >
            <RefreshCw size={15} /> รีเฟรชอันดับ
          </button>
        </div>
        <div className="speed-race-info">
          <span>
            <Users size={16} /> {number(entries.length)} สมาชิก
          </span>
          {mine && (
            <span className="speed-my-rank">
              อันดับของคุณ <strong>#{mine.rank}</strong> · {number(mine.totalScore)} คะแนน
            </span>
          )}
          {data && <span>อัปเดต {dateTime(data.generatedAt)}</span>}
        </div>
        <p className="home-score-note">
          รวมคะแนนสูงสุดของแต่ละโจทย์ที่เผยแพร่ นับแต่ละข้อครั้งเดียว
          ไม่บวกซ้ำจากการส่งหลายครั้งหรือการแข่งขัน คะแนนที่รีเซ็ตและโจทย์ที่ลบจะไม่นับ
        </p>
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Loading />
        ) : (
          !error &&
          (entries.length ? (
            <>
              <div className="speed-podium" aria-label="ผู้ทำคะแนนสูงสุด 3 คน">
                {entries.slice(0, 3).map((row, index) => (
                  <article className={`speed-podium-card place-${index + 1}`} key={row.userId}>
                    <span className="speed-place-label">
                      <Crown size={16} /> อันดับ {row.rank}
                    </span>
                    <div className="speed-podium-avatar">
                      <RacerAvatar entry={row} />
                      <span className="speed-position">{row.rank}</span>
                    </div>
                    <h2>{row.displayName}</h2>
                    {row.userId === user?.id && <span className="speed-you">คุณ</span>}
                    <div className="speed-podium-score">
                      {number(row.totalScore)} <small>คะแนน</small>
                    </div>
                  </article>
                ))}
              </div>
              <div className="speed-grid-heading">
                <span>สมาชิกทั้งหมด</span>
                <small>คะแนนเท่ากันได้อันดับร่วมกัน</small>
              </div>
              <div className="table-scroll">
                <table className="speed-table">
                  <thead>
                    <tr>
                      <th>อันดับ</th>
                      <th>สมาชิก</th>
                      <th>คะแนนรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice((page - 1) * 50, page * 50).map((row) => (
                      <tr key={row.userId} className={row.userId === user?.id ? 'is-me' : ''}>
                        <td>
                          <strong>#{row.rank}</strong>
                        </td>
                        <td>
                          <div className="home-member">
                            <RacerAvatar entry={row} />
                            <strong>{row.displayName}</strong>
                            {row.userId === user?.id && <span className="speed-you">คุณ</span>}
                          </div>
                        </td>
                        <td>
                          <strong>{number(row.totalScore)}</strong> คะแนน
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="home-pagination">
                <button className="speed-refresh" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  ก่อนหน้า
                </button>
                หน้า {page}
                <button
                  className="speed-refresh"
                  disabled={page * 50 >= entries.length}
                  onClick={() => setPage(page + 1)}
                >
                  ถัดไป
                </button>
              </div>
            </>
          ) : (
            <Empty title="ยังไม่มีสมาชิกที่ยอมรับเงื่อนไข" />
          ))
        )}
      </section>
    </div>
  );
}
