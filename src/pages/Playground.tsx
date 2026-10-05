import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { Clock3, FileCode2, LockKeyhole, MemoryStick, Play, RotateCcw, Save } from 'lucide-react';
import { useAuth } from '../auth';
import { Badge, Empty, ErrorBox, Heading, Loading } from '../components/ui';
import { api, json, message } from '../lib/api';
import { codeTemplates } from '../lib/code';
import { duration, languageName, useResource } from '../lib/hooks';
import type { Language, PlaygroundRunResult, SystemSettings } from '../types';

export function Playground() {
  const { user } = useAuth();
  const { data: settings, loading, error, reload } = useResource<SystemSettings>('/settings');
  return (
    <div className="page playground-page">
      <Heading eyebrow="CODE / RUN / LEARN" title="Playground">
        ทดลองเขียนและรันโค้ด C++ หรือ Python ด้วยข้อมูลนำเข้าของคุณเอง
      </Heading>
      {loading ? (
        <section className="panel">
          <Loading />
        </section>
      ) : error ? (
        <ErrorBox error={error} retry={reload} />
      ) : !settings?.playgroundEnabled ? (
        <section className="panel">
          <Empty title="Playground ปิดใช้งานอยู่">
            ผู้ดูแลระบบยังไม่ได้เปิดพื้นที่ทดลองโค้ด
            {user?.role === 'ADMIN' && (
              <>
                {' '}
                <Link className="text-link" to="/admin/settings">
                  ไปที่ตั้งค่าระบบ
                </Link>
              </>
            )}
          </Empty>
          <div className="playground-closed-icon" aria-hidden="true">
            <LockKeyhole />
          </div>
        </section>
      ) : (
        <PlaygroundEditor />
      )}
    </div>
  );
}

function PlaygroundEditor() {
  const [language, setLanguage] = useState<Language>('PYTHON');
  return (
    <div className="playground-grid">
      <section className="panel playground-editor-panel">
        <div className="editor-toolbar">
          <span>
            <FileCode2 size={19} />
            พื้นที่เขียนโค้ด
          </span>
          <select
            aria-label="ภาษาใน Playground"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="CPP">C++</option>
            <option value="PYTHON">Python</option>
          </select>
        </div>
        <Runner key={language} language={language} />
      </section>
      <aside className="playground-guide panel">
        <div className="panel-title">
          <h2>พื้นที่ทดลองอิสระ</h2>
        </div>
        <div className="playground-guide-body">
          <p>ใส่ข้อมูลที่โปรแกรมจะอ่านในช่อง stdin แล้วกดรันเพื่อดูผลลัพธ์ทันที</p>
          <dl>
            <div>
              <dt>ภาษา</dt>
              <dd>C++ / Python</dd>
            </div>
            <div>
              <dt>เวลาสูงสุด</dt>
              <dd>3 วินาที</dd>
            </div>
            <div>
              <dt>หน่วยความจำ</dt>
              <dd>128 MB</dd>
            </div>
          </dl>
          <small>ฉบับร่างและ stdin บันทึกเฉพาะใน browser เครื่องนี้</small>
        </div>
      </aside>
    </div>
  );
}

function Runner({ language }: { language: Language }) {
  const { user } = useAuth();
  const codeKey = `nr-playground-code:${user?.id}:${language}`;
  const inputKey = `nr-playground-input:${user?.id}:${language}`;
  const [code, setCode] = useState(() => readDraft(codeKey, codeTemplates[language]));
  const [stdin, setStdin] = useState(() => readDraft(inputKey, ''));
  const [result, setResult] = useState<PlaygroundRunResult>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => writeDraft(codeKey, code), [code, codeKey]);
  useEffect(() => writeDraft(inputKey, stdin), [inputKey, stdin]);

  async function run() {
    if (lock.current || !code.trim() || code.length > 100_000 || stdin.length > 100_000) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setResult(undefined);
    try {
      setResult(
        await api<PlaygroundRunResult>(
          '/playground/run',
          json('POST', { language, sourceCode: code, stdin }),
        ),
      );
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  const diagnostic = [result?.compilerOutput, result?.stderr, result?.message].filter(Boolean).join('\n');
  return (
    <>
      <div className="editor-file">
        <span className="file-tab">{language === 'CPP' ? 'main.cpp' : 'main.py'}</span>
        <button
          className="icon-button"
          aria-label="เริ่มโค้ด Playground ใหม่"
          title="เริ่มโค้ดใหม่"
          onClick={() => {
            if (window.confirm('แทนที่โค้ดฉบับร่างด้วยโค้ดเริ่มต้น?')) {
              setCode(codeTemplates[language]);
              setResult(undefined);
              setError('');
            }
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <CodeMirror
        value={code}
        height="500px"
        theme="dark"
        extensions={[language === 'CPP' ? cpp() : python()]}
        onChange={setCode}
        basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
        aria-label="ตัวแก้ไขโค้ด Playground"
      />
      <div className="editor-status">
        <span>
          <Save size={14} /> บันทึกฉบับร่างในเครื่องอัตโนมัติ
        </span>
        <span>{code.length.toLocaleString()} / 100,000 ตัวอักษร</span>
      </div>
      <div className="playground-io">
        <label>
          <span>ข้อมูลนำเข้า (stdin)</span>
          <textarea
            aria-label="ข้อมูลนำเข้า Playground"
            rows={6}
            value={stdin}
            maxLength={100_000}
            onChange={(event) => setStdin(event.target.value)}
            placeholder="ข้อมูลที่โปรแกรมจะอ่าน เช่น 2 3"
          />
          <small>{stdin.length.toLocaleString()} / 100,000 ตัวอักษร</small>
        </label>
        <ErrorBox error={error} />
        {code.length > 100_000 && <ErrorBox error="โค้ดยาวเกิน 100,000 ตัวอักษร" />}
        <button
          className="button primary playground-run"
          disabled={busy || !code.trim() || code.length > 100_000 || stdin.length > 100_000}
          onClick={() => void run()}
        >
          <Play size={17} fill="currentColor" />
          {busy ? 'กำลังรัน…' : `รัน ${languageName(language)}`}
        </button>
      </div>
      {result && (
        <section className="playground-result" aria-live="polite">
          <div className="playground-result-head">
            <div>
              <span>ผลการทำงาน</span>
              <Badge status={result.status} />
            </div>
            <div className="playground-metrics">
              <span>
                <Clock3 size={14} /> {duration(result.executionTimeMs)}
              </span>
              <span>
                <MemoryStick size={14} /> {duration(result.memoryUsedKb, 'KB')}
              </span>
            </div>
          </div>
          <div className="playground-output">
            <h3>ผลลัพธ์ (stdout)</h3>
            <pre>{result.stdout || '(ไม่มีผลลัพธ์)'}</pre>
          </div>
          {diagnostic && (
            <div className="playground-output diagnostic">
              <h3>ข้อความจากระบบ</h3>
              <pre>{diagnostic}</pre>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function readDraft(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeDraft(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The editor stays usable when storage is unavailable.
  }
}
