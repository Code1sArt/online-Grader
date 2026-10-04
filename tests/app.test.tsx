import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { AuthProvider } from '../src/auth';
import { tokenStore } from '../src/lib/api';
import { competition, problem, submission, user } from './fixtures';

vi.mock('../src/components/GoogleSignIn', () => ({
  GoogleSignIn: ({ onCredential }: { onCredential: (s: string) => void }) => (
    <button onClick={() => onCredential('google-test-credential')}>Sign in with Google</button>
  ),
}));
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="ตัวแก้ไขโค้ด" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
let requests: { path: string; options: RequestInit }[];
let role: 'USER' | 'ADMIN';
let failProblems: boolean;
let joined: boolean;
beforeEach(() => {
  requests = [];
  role = 'USER';
  failProblems = false;
  joined = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const path = url.replace('/api', '');
      requests.push({ path, options });
      if (path === '/problems' && failProblems)
        return new Response(JSON.stringify({ message: 'API unavailable' }), { status: 503 });
      const payload =
        path === '/auth/me'
          ? { ...user, role }
          : path === '/auth/google'
            ? { accessToken: 'session-test-token', user: { ...user, role } }
            : path === '/problems'
              ? [problem]
              : path === '/problems/p1'
                ? problem
                : path === '/submissions/me'
                  ? []
                  : path === '/submissions'
                    ? { id: 's1', status: 'QUEUED' }
                    : path === '/submissions/s1'
                      ? submission
                      : path === '/competitions/c1/join'
                        ? ((joined = true), {})
                        : path === '/competitions/c1'
                          ? {
                              ...competition,
                              joined,
                              participants: joined ? [{ joinedAt: new Date().toISOString() }] : [],
                            }
                          : path === '/competitions/c1/leaderboard'
                            ? { entries: [] }
                            : path === '/competitions'
                              ? [competition]
                              : path.endsWith('/test-cases')
                                ? {}
                                : null;
      if (payload === null) throw new Error(`Unexpected request ${path}`);
      return new Response(JSON.stringify(payload), { status: 200 });
    }),
  );
});
function mount(path = '/problems', signedIn = true) {
  if (signedIn) tokenStore.set('session-test-token');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}
describe('NR Grader user workflows', () => {
  it('protects anonymous pages and signs in using a Google credential', async () => {
    mount('/problems', false);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));
    expect(await screen.findByRole('heading', { name: 'คลังโจทย์' })).toBeInTheDocument();
    expect(JSON.parse(requests.find((r) => r.path === '/auth/google')!.options.body as string)).toEqual({
      idToken: 'google-test-credential',
    });
    expect(tokenStore.get()).toBe('session-test-token');
  });
  it('prevents normal users from accessing admin forms', async () => {
    mount('/admin/problems/new');
    expect(await screen.findByRole('heading', { name: 'คลังโจทย์' })).toBeInTheDocument();
    expect(screen.queryByLabelText('ชื่อโจทย์')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'จัดการโจทย์' })).not.toBeInTheDocument();
  });
  it('filters real API problems and shows an explicit empty result', async () => {
    mount();
    expect(await screen.findByRole('link', { name: problem.title })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'ค้นหาโจทย์' }), 'not-a-problem');
    expect(screen.getByText('ไม่พบโจทย์ที่ตรงกับตัวกรอง')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: problem.title })).not.toBeInTheDocument();
  });
  it('reports API errors and retries without inventing problems', async () => {
    failProblems = true;
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    failProblems = false;
    await userEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
    expect(await screen.findByRole('link', { name: problem.title })).toBeInTheDocument();
  });
  it('keeps drafts per language and submits the selected code with the competition ID', async () => {
    mount('/problems/p1?competitionId=c1');
    await screen.findByRole('heading', { name: problem.title });
    await userEvent.selectOptions(screen.getByLabelText('ภาษาสำหรับส่งคำตอบ'), 'PYTHON');
    const editor = screen.getByRole('textbox', { name: 'ตัวแก้ไขโค้ด' });
    await userEvent.clear(editor);
    await userEvent.type(editor, 'print(5)');
    await userEvent.selectOptions(screen.getByLabelText('ภาษาสำหรับส่งคำตอบ'), 'CPP');
    expect((screen.getByRole('textbox', { name: 'ตัวแก้ไขโค้ด' }) as HTMLTextAreaElement).value).toContain(
      '#include',
    );
    await userEvent.selectOptions(screen.getByLabelText('ภาษาสำหรับส่งคำตอบ'), 'PYTHON');
    expect(screen.getByRole('textbox', { name: 'ตัวแก้ไขโค้ด' })).toHaveValue('print(5)');
    await userEvent.click(screen.getByRole('button', { name: 'ส่งคำตอบ' }));
    expect(await screen.findByRole('heading', { name: 'ผลตรวจรายเทสเคส' })).toBeInTheDocument();
    expect(JSON.parse(requests.find((r) => r.path === '/submissions')!.options.body as string)).toEqual({
      problemId: 'p1',
      language: 'PYTHON',
      sourceCode: 'print(5)',
      competitionId: 'c1',
    });
  });
  it('joins a competition before showing the problem entry link', async () => {
    mount('/competitions/c1');
    await userEvent.click(await screen.findByRole('button', { name: 'สมัครเข้าร่วม' }));
    expect(await screen.findByRole('link', { name: 'ทำโจทย์' })).toHaveAttribute(
      'href',
      '/problems/p1?competitionId=c1',
    );
    expect(requests.find((r) => r.path === '/competitions/c1/join')?.options.method).toBe('POST');
  });
  it('clears the session on logout', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'ออกจากระบบ' }));
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
  // File uploads are tested in real Chromium: jsdom does not synchronize user-event
  // file lists with native required validation / FormData(form).
  it('saves problem edits with numeric limits and language settings', async () => {
    role = 'ADMIN';
    mount('/admin/problems/p1');
    const title = await screen.findByLabelText('ชื่อโจทย์');
    await userEvent.clear(title);
    await userEvent.type(title, 'Updated problem');
    await userEvent.clear(screen.getByLabelText('Time Limit (ms)'));
    await userEvent.type(screen.getByLabelText('Time Limit (ms)'), '2000');
    await userEvent.click(screen.getByRole('button', { name: 'บันทึกโจทย์' }));
    await waitFor(() =>
      expect(requests.some((r) => r.path === '/problems/p1' && r.options.method === 'PATCH')).toBe(true),
    );
    const request = requests.find((r) => r.path === '/problems/p1' && r.options.method === 'PATCH')!;
    expect(JSON.parse(request.options.body as string)).toMatchObject({
      title: 'Updated problem',
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      maxScore: 100,
      allowedLanguages: ['CPP', 'PYTHON'],
    });
  });
});
