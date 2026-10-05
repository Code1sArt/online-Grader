import { useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Braces, Check, CodeXml, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Layout';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { ErrorBox, Loading } from '../components/ui';
import { useAuth } from '../auth';
import { message } from '../lib/api';

export function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const next = (location.state as { from?: string } | null)?.from;
  if (loading) return <Loading />;
  if (user)
    return (
      <Navigate
        to={
          next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/problems'
        }
        replace
      />
    );
  async function signIn(credential: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await login(credential);
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="login-brand-row">
          <Brand />
          <div className="login-camp">
            <img src="/posn-logo.webp" alt="ตราสัญลักษณ์ สอวน." />
            <span>ค่ายโอลิมปิกวิชาการ สอวน. ค่าย 1 วิชาคอมพิวเตอร์ โรงเรียนนางรอง</span>
          </div>
        </div>
        <div className="story-content">
          <div className="eyebrow">YOUR NEXT LINE STARTS HERE</div>
          <h1>
            ทุกคำตอบที่ดี
            <br />
            เริ่มจากการ<span>ลงมือเขียน</span>
          </h1>
          <p>
            ฝึกแก้โจทย์ด้วย C++ และ Python
            <br />
            เรียนรู้จากผลตรวจ แล้วพัฒนาคำตอบของคุณให้ดีขึ้น
          </p>
          <div className="code-card">
            <div className="code-card-bar">
              <span className="window-dots">● ● ●</span>
              <span>first_step.py</span>
              <CodeXml size={18} />
            </div>
            <pre>
              <span className="comment"># จุดเริ่มต้นของทุกความเป็นไปได้</span>
              {'\n\n'}
              <span className="purple">def</span> <span className="mint">solve</span>():{'\n'} a, b ={' '}
              <span className="mint">map</span>(<span className="purple">int</span>,{' '}
              <span className="mint">input</span>().split()){'\n'} <span className="mint">print</span>(a + b)
              {'\n\n'}solve()
            </pre>
            <div className="code-card-bottom">
              <Braces size={16} />
              <span>คิดให้เป็น เขียนให้ได้</span>
              <span>Python</span>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>NR GRADER</span>
          <span>Practice makes progress.</span>
        </div>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <div className="login-symbol">
            <Braces size={30} />
          </div>
          <div className="eyebrow">ยินดีต้อนรับสู่ NR GRADER</div>
          <h2>
            พร้อมสำหรับโจทย์
            <br />
            ต่อไปหรือยัง?
          </h2>
          <p>
            เข้าสู่ระบบเพื่อเริ่มฝึกเขียนโปรแกรม
            <br />
            และติดตามความก้าวหน้าของคุณ
          </p>
          <div className={busy ? 'signin-busy' : ''} aria-busy={busy}>
            <GoogleSignIn onCredential={(credential) => void signIn(credential)} />
          </div>
          {busy && <p role="status">กำลังเข้าสู่ระบบ…</p>}
          <ErrorBox error={error} />
          <div className="login-divider">
            <span>พื้นที่เรียนรู้ของคุณ</span>
          </div>
          <ul className="login-benefits">
            <li>
              <Check />
              เลือกฝึกโจทย์ตามระดับของคุณ
            </li>
            <li>
              <Check />
              ตรวจคำตอบและดูผลรายเทสเคส
            </li>
            <li>
              <Check />
              ท้าทายตัวเองในสนามแข่งขัน
            </li>
          </ul>
          <div className="login-privacy">
            <ShieldCheck size={19} />
            <span>
              ใช้บัญชี Google ของคุณเพื่อเข้าสู่ระบบ
              <br />
              ไม่ต้องสร้างรหัสผ่านเพิ่มเติม
            </span>
          </div>
        </div>
        <p className="login-bottom">C++ & Python · Learn by doing</p>
      </section>
    </div>
  );
}
