import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import Markdown from 'react-markdown';
import { Clock3, Cpu, Send, RotateCcw, Save, ChevronLeft, FileCode2 } from 'lucide-react';
import { useAuth } from '../auth';
import { api, json, message } from '../lib/api';
import { codeTemplates } from '../lib/code';
import { useResource, languageName, number } from '../lib/hooks';
import { Difficulty, ErrorBox, Loading } from '../components/ui';
import type { Language, Problem } from '../types';

export function Workspace() {
  const { id } = useParams();
  const { data: problem, loading, error, reload } = useResource<Problem>(`/problems/${id}`);
  if (loading) return <Loading />;
  if (error || !problem)
    return (
      <div className="page">
        <ErrorBox error={error || 'ไม่พบโจทย์'} retry={reload} />
      </div>
    );
  return <ProblemWorkspace key={problem.id} problem={problem} />;
}
function ProblemWorkspace({ problem }: { problem: Problem }) {
  const [language, setLanguage] = useState<Language>(problem.allowedLanguages[0] || 'CPP');
  const [params] = useSearchParams();
  const competitionId = params.get('competitionId');
  const samples = (problem.testCases || []).filter((test) => test.isSample !== false);
  return (
    <div className="workspace-page">
      <div className="workspace-top">
        <Link className="back-link" to={competitionId ? `/competitions/${competitionId}` : '/problems'}>
          <ChevronLeft size={17} />
          {competitionId ? 'กลับสู่การแข่งขัน' : 'คลังโจทย์'}
        </Link>
        <span className="muted">{competitionId ? 'โหมดแข่งขัน' : 'โหมดฝึกฝน'}</span>
      </div>
      <div className="workspace-grid">
        <article className="statement panel">
          <div className="statement-header">
            <div className="eyebrow">{problem.slug}</div>
            <h1>{problem.title}</h1>
            <Difficulty value={problem.difficulty} />
            <div className="limits">
              <span>
                <Clock3 size={16} />
                {number(problem.timeLimitMs)} ms
              </span>
              <span>
                <Cpu size={16} />
                {number(problem.memoryLimitMb)} MB
              </span>
              <span>{number(problem.maxScore)} คะแนน</span>
            </div>
          </div>
          <div className="statement-body">
            <div className="markdown">
              <Markdown>{problem.statement || ''}</Markdown>
            </div>
            {problem.inputDescription && (
              <section>
                <h2>ข้อมูลนำเข้า</h2>
                <div className="markdown">
                  <Markdown>{problem.inputDescription}</Markdown>
                </div>
              </section>
            )}
            {problem.outputDescription && (
              <section>
                <h2>ข้อมูลส่งออก</h2>
                <div className="markdown">
                  <Markdown>{problem.outputDescription}</Markdown>
                </div>
              </section>
            )}
            {problem.constraints && (
              <section>
                <h2>ข้อจำกัด</h2>
                <div className="markdown">
                  <Markdown>{problem.constraints}</Markdown>
                </div>
              </section>
            )}
            <section>
              <h2>ตัวอย่าง</h2>
              {samples.length ? (
                samples.map((sample, i) => (
                  <div className="sample" key={sample.id}>
                    <h3>ตัวอย่างที่ {i + 1}</h3>
                    <div className="sample-columns">
                      <div>
                        <div className="sample-label">Input</div>
                        <pre>{sample.input || '(ไม่มี input)'}</pre>
                      </div>
                      <div>
                        <div className="sample-label">Output</div>
                        <pre>{sample.expectedOutput || '(ไม่มี output)'}</pre>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">โจทย์นี้ไม่มีตัวอย่างเผยแพร่</p>
              )}
            </section>
          </div>
        </article>
        <section className="editor-panel panel">
          <div className="editor-toolbar">
            <span>
              <FileCode2 size={19} />
              คำตอบของคุณ
            </span>
            <select
              aria-label="ภาษาสำหรับส่งคำตอบ"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {problem.allowedLanguages.map((l) => (
                <option key={l} value={l}>
                  {languageName(l)}
                </option>
              ))}
            </select>
          </div>
          <CodePane
            key={`${problem.id}:${language}:${competitionId || 'practice'}`}
            language={language}
            problem={problem}
            competitionId={competitionId}
          />
        </section>
      </div>
    </div>
  );
}
function CodePane({
  language,
  problem,
  competitionId,
}: {
  language: Language;
  problem: Problem;
  competitionId: string | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draftKey = `nr-draft:${user?.id}:${problem.id}:${language}:${competitionId || 'practice'}`;
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(draftKey) ?? codeTemplates[language];
    } catch {
      return codeTemplates[language];
    }
  });
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, code);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [code, draftKey]);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ id: string }>(
        '/submissions',
        json('POST', {
          problemId: problem.id,
          language,
          sourceCode: code,
          ...(competitionId ? { competitionId } : {}),
        }),
      );
      navigate(`/submissions/${result.id}`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <>
      <div className="editor-file">
        <span className="file-tab">{language === 'CPP' ? 'main.cpp' : 'main.py'}</span>
        <button
          className="icon-button"
          aria-label="เริ่มโค้ดใหม่"
          title="เริ่มโค้ดใหม่"
          onClick={() => {
            if (window.confirm('แทนที่โค้ดฉบับร่างด้วยโค้ดเริ่มต้น?')) setCode(codeTemplates[language]);
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <CodeMirror
        value={code}
        height="460px"
        theme="dark"
        extensions={[language === 'CPP' ? cpp() : python()]}
        onChange={setCode}
        basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
        aria-label="ตัวแก้ไขโค้ด"
      />
      <div className="editor-status">
        <span>
          <Save size={14} />
          {saved ? 'บันทึกฉบับร่างในเครื่องแล้ว' : 'บันทึกในเครื่องไม่ได้ กรุณาคัดลอกโค้ดเก็บไว้'}
        </span>
        <span>{code.length.toLocaleString()} / 100,000 ตัวอักษร</span>
      </div>
      <div className="editor-submit">
        <ErrorBox error={error} />
        {code.length > 100000 && <ErrorBox error="โค้ดยาวเกิน 100,000 ตัวอักษร" />}
        <p>
          ส่งคำตอบเพื่อตรวจทุกเทสเคสของโจทย์
          <br />
          <span className="muted">ผลตรวจจะแสดงในหน้าการส่งคำตอบ</span>
        </p>
        <button
          className="button primary"
          disabled={busy || !code.trim() || code.length > 100000 || problem.status !== 'PUBLISHED'}
          onClick={() => void submit()}
        >
          <Send size={17} />
          {busy ? 'กำลังส่งคำตอบ…' : 'ส่งคำตอบ'}
        </button>
      </div>
    </>
  );
}
