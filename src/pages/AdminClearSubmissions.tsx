import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ErrorBox, Heading } from '../components/ui';
import { api, message } from '../lib/api';
import { number } from '../lib/hooks';
import { useSubmissionDrafts } from '../lib/drafts';

export function AdminClearSubmissions() {
  const { applyVersion } = useSubmissionDrafts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function clear() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ deletedCount: number; submissionDraftVersion: number }>(
        '/submissions/admin/all',
        {
          method: 'DELETE',
          confirmation:
            'ล้างประวัติการส่ง โค้ด ฉบับร่างโจทย์ ผลตรวจ และคะแนนทั้งหมดของผู้ใช้ทุกคน ทั้งการฝึกทำโจทย์และการแข่งขัน? คะแนนใน Home และตารางอันดับการแข่งขันจะถูกล้างด้วย การลบนี้ถาวรและกู้คืนไม่ได้',
        },
      );
      applyVersion(result.submissionDraftVersion);
      setNotice(`ล้างประวัติการส่งและคะแนนทั้งหมดแล้ว รวม ${number(result.deletedCount)} คำตอบ`);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Heading eyebrow="ADMIN / SUBMISSIONS" title="ล้างประวัติและคะแนน">
        ล้างข้อมูลการส่งคำตอบและคะแนนทั้งหมดของผู้ใช้ทุกคน
      </Heading>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <ErrorBox error={error} />
      <section className="panel">
        <div className="panel-title">
          <h2>
            <Trash2 size={19} /> ล้างประวัติการส่งและคะแนนทั้งหมด
          </h2>
        </div>
        <div className="clear-submissions-body">
          <p>
            ลบประวัติการส่ง โค้ด ผลตรวจ และคะแนนของทุกคน ทั้งการฝึกทำโจทย์และการแข่งขัน รวมถึงคะแนนใน Home
            และตารางอันดับการแข่งขัน
          </p>
          <p>
            บัญชีสมาชิก โจทย์ การแข่งขัน และการสมัครแข่งขันจะยังคงอยู่
            ผู้ใช้สามารถส่งคำตอบใหม่เพื่อเก็บคะแนนได้ตามปกติ
          </p>
          <p>
            <strong>การลบนี้ถาวรและไม่สามารถกู้คืนได้</strong>
          </p>
          <p>
            ฉบับร่างโค้ดโจทย์ในเครื่องนี้จะถูกล้างทันที เครื่องอื่นจะล้างเมื่อเชื่อมต่อและตรวจพบการล้างข้อมูล
            ฉบับร่างใน Playground ยังคงอยู่
          </p>
          <button type="button" className="button danger" disabled={busy} onClick={() => void clear()}>
            <Trash2 size={18} /> {busy ? 'กำลังดำเนินการ…' : 'ล้างประวัติการส่งและคะแนนทั้งหมด'}
          </button>
        </div>
      </section>
    </div>
  );
}
