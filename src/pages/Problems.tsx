import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, CodeXml, Search, Trophy } from 'lucide-react';
import { useResource, number, languageName } from '../lib/hooks';
import { Difficulty, Empty, ErrorBox, Heading, Loading } from '../components/ui';
import type { Problem, Submission } from '../types';
import { useAuth } from '../auth';

export function Problems() {
  const { data, error, loading, reload } = useResource<Problem[]>('/problems');
  const history = useResource<Submission[]>('/submissions/me');
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [language, setLanguage] = useState('all');
  const [filter, setFilter] = useState('all');
  const problems = (data || []).filter((p) => p.status === 'PUBLISHED');
  const solved = new Set(
    (history.data || []).filter((s) => s.status === 'ACCEPTED' && !s.scoreResetAt).map((s) => s.problem.id),
  );
  const attempted = new Set((history.data || []).map((s) => s.problem.id));
  const filtered = problems.filter(
    (p) =>
      `${p.title} ${p.slug}`.toLowerCase().includes(search.toLowerCase()) &&
      (difficulty === 'all' || String(p.difficulty) === difficulty) &&
      (language === 'all' || p.allowedLanguages.includes(language as 'CPP' | 'PYTHON')) &&
      (filter === 'all' || (filter === 'solved' ? solved.has(p.id) : !solved.has(p.id))),
  );
  return (
    <div className="page">
      <Heading eyebrow="PRACTICE SPACE" title="คลังโจทย์">
        เลือกโจทย์ที่ใช่ แล้วเริ่มเขียนคำตอบในแบบของคุณ
      </Heading>
      <section className="welcome-panel">
        <div>
          <span className="eyebrow">สวัสดี {user?.displayName.split(' ')[0]}</span>
          <h2>
            อีกหนึ่งโจทย์
            <br />
            อีกหนึ่งก้าวของคุณ<span className="mint">.</span>
          </h2>
          <p>ลอง ลงมือเขียน และเรียนรู้จากทุกคำตอบ</p>
          <div className="language-pills">
            <span>C++</span>
            <span>Python</span>
          </div>
        </div>
        <div className="welcome-code" aria-hidden="true">
          <CodeXml size={80} strokeWidth={1} />
          <div>
            <span className="mint">while</span> (learning) {'{'}
            <br />
            <span className="code-indent">keepGoing();</span>
            <br />
            {'}'}
          </div>
        </div>
      </section>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <BookOpen />
          </span>
          <div>
            <span>โจทย์พร้อมฝึก</span>
            <strong>
              {data ? problems.length : '—'}
              <small>โจทย์</small>
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon success">
            <CheckCircle2 />
          </span>
          <div>
            <span>ทำสำเร็จล่าสุด</span>
            <strong>
              {history.data ? solved.size : '—'}
              <small>โจทย์</small>
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon violet">
            <CodeXml />
          </span>
          <div>
            <span>การส่งคำตอบล่าสุด</span>
            <strong>
              {history.loading ? '—' : (history.data?.length ?? '—')}
              <small>ครั้ง</small>
            </strong>
          </div>
        </div>
      </div>
      <div className="library-layout">
        <section className="panel">
          <div className="panel-title">
            <h2>เลือกโจทย์ของคุณ</h2>
            <span className="muted">{filtered.length} โจทย์</span>
          </div>
          <div className="filters">
            <div className="search-input">
              <Search size={18} />
              <input
                aria-label="ค้นหาโจทย์"
                placeholder="ค้นหาชื่อหรือรหัสโจทย์…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="ระดับความยาก"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="all">ทุกระดับ</option>
              {['เริ่มต้น', 'พื้นฐาน', 'ปานกลาง', 'ท้าทาย', 'ขั้นสูง'].map((s, i) => (
                <option key={s} value={i + 1}>
                  {s}
                </option>
              ))}
            </select>
            <select aria-label="ภาษาโปรแกรม" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="all">ทุกภาษา</option>
              <option value="CPP">C++</option>
              <option value="PYTHON">Python</option>
            </select>
          </div>
          <div className="filter-tabs" aria-label="สถานะการทำโจทย์">
            {[
              ['all', 'ทั้งหมด'],
              ['todo', 'ยังไม่สำเร็จ'],
              ['solved', 'ทำสำเร็จแล้ว'],
            ].map(([value, text]) => (
              <button
                key={value}
                className={filter === value ? 'selected' : ''}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {text}
              </button>
            ))}
          </div>
          <ErrorBox error={error} retry={reload} />
          <ErrorBox error={history.error} retry={history.reload} />
          {loading ? (
            <Loading />
          ) : (
            !error &&
            (!filtered.length ? (
              <Empty title={problems.length ? 'ไม่พบโจทย์ที่ตรงกับตัวกรอง' : 'ยังไม่มีโจทย์เผยแพร่'}>
                {problems.length
                  ? 'ลองเปลี่ยนคำค้นหาหรือระดับความยาก'
                  : 'เมื่อผู้ดูแลเพิ่มโจทย์ คุณจะเริ่มฝึกได้จากหน้านี้'}
              </Empty>
            ) : (
              <div className="table-scroll">
                <table className="problem-table">
                  <thead>
                    <tr>
                      <th>สถานะ</th>
                      <th>โจทย์</th>
                      <th>ระดับ</th>
                      <th>คะแนน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {solved.has(p.id) ? (
                            <CheckCircle2 size={20} className="green-text" aria-label="ทำสำเร็จแล้ว" />
                          ) : (
                            <span
                              className={`problem-dot ${attempted.has(p.id) ? 'attempted' : ''}`}
                              aria-label={attempted.has(p.id) ? 'เคยส่งคำตอบ' : 'ยังไม่ได้ทำ'}
                            />
                          )}
                        </td>
                        <td>
                          <Link className="problem-title" to={`/problems/${p.id}`}>
                            {p.title}
                          </Link>
                          <small>
                            {p.slug} <span>·</span> {p.allowedLanguages.map(languageName).join(' / ')}
                          </small>
                        </td>
                        <td>
                          <Difficulty value={p.difficulty} />
                        </td>
                        <td className="mono">{number(p.maxScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
          <div className="panel-foot">สถิติอ้างอิงการส่งคำตอบล่าสุดสูงสุด 100 ครั้ง</div>
        </section>
        <aside className="practice-aside">
          <div className="competition-promo">
            <Trophy size={28} />
            <span className="eyebrow">NEXT CHALLENGE</span>
            <h3>
              พร้อมลงสนาม
              <br />
              แข่งขันหรือยัง?
            </h3>
            <p>วัดทักษะการแก้โจทย์ ความเร็ว และการใช้หน่วยความจำ</p>
            <Link className="button dark" to="/competitions">
              ดูการแข่งขัน
            </Link>
          </div>
          <div className="practice-tip">
            <span className="eyebrow">ก่อนส่งคำตอบ</span>
            <h3>เช็กอีกนิด มั่นใจขึ้น</h3>
            <p>อ่านรูปแบบ Input / Output ให้ครบ และตรวจสอบ Time Limit กับ Memory Limit ของแต่ละโจทย์</p>
            <div className="tip-rule" />
            <span>เขียน • ทดสอบ • เรียนรู้</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
