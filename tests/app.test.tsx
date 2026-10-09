import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
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
  default: ({
    value,
    onChange,
    'aria-label': ariaLabel,
  }: {
    value: string;
    onChange: (v: string) => void;
    'aria-label'?: string;
  }) => (
    <textarea
      aria-label={ariaLabel || 'ตัวแก้ไขโค้ด'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
let requests: { path: string; options: RequestInit }[];
let role: 'USER' | 'ADMIN';
let failProblems: boolean;
let joined: boolean;
let playgroundEnabled: boolean;
let groupedSubmission: boolean;
let privacyRequired: boolean;
beforeEach(() => {
  requests = [];
  role = 'USER';
  groupedSubmission = false;
  privacyRequired = false;
  failProblems = false;
  joined = false;
  playgroundEnabled = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const path = url.replace('/api', '').split('?')[0];
      requests.push({ path, options });
      if (path === '/problems' && failProblems)
        return new Response(JSON.stringify({ message: 'API unavailable' }), { status: 503 });
      const payload =
        path === '/leaderboard'
          ? {
              generatedAt: submission.submittedAt,
              entries: [
                { userId: user.id, displayName: user.displayName, avatarUrl: null, rank: 1, totalScore: 100 },
              ],
            }
          : path === '/auth/privacy'
            ? {
                title: 'ความเป็นส่วนตัวและเงื่อนไขการใช้งาน',
                version: '2026-10-09-v1',
                paragraphs: ['เก็บ IP 90 วัน'],
              }
            : path === '/auth/consent'
              ? ((privacyRequired = false), { ...user, role, requiresPrivacyAcceptance: false })
              : path === '/members'
                ? {
                    total: 1,
                    pageSize: 50,
                    items: [
                      {
                        ...user,
                        isActive: true,
                        deletedAt: null,
                        createdAt: submission.submittedAt,
                        usage: { graderRunCount: 3 },
                        _count: { submissions: 2 },
                      },
                    ],
                  }
                : path === `/members/${user.id}/status` || path === `/members/${user.id}`
                  ? {}
                  : path === `/members/${user.id}/history`
                    ? {
                        user: { ...user, usage: { loginCount: 1, playgroundCount: 2, graderRunCount: 3 } },
                        total: 1,
                        pageSize: 50,
                        items: [
                          { id: 'log', kind: 'LOGIN', ip: '203.0.113.10', createdAt: submission.submittedAt },
                        ],
                      }
                    : path === '/submissions/me/problems' || path === '/submissions/admin/problems'
                      ? [
                          {
                            problem,
                            submissionCount: 2,
                            userCount: 1,
                            bestScore: 100,
                            lastSubmittedAt: submission.submittedAt,
                          },
                        ]
                      : path === '/submissions/me/problems/p1' ||
                          path === '/submissions/admin/problems/p1/users/test-user'
                        ? { problem, user, items: [submission], total: 1, page: 1, pageSize: 50 }
                        : path === '/submissions/admin/problems/p1'
                          ? {
                              problem,
                              respondents: [
                                {
                                  user,
                                  submissionCount: 2,
                                  bestScore: 100,
                                  lastSubmittedAt: submission.submittedAt,
                                },
                              ],
                            }
                          : path === '/submissions/admin/problems/p1/reset'
                            ? { resetCount: 2 }
                            : path === '/auth/me'
                              ? { ...user, role, requiresPrivacyAcceptance: privacyRequired }
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
                                          ? groupedSubmission
                                            ? {
                                                ...submission,
                                                status: 'PARTIAL',
                                                subtaskResults: [
                                                  {
                                                    subtaskId: 'g1',
                                                    name: 'ข้อมูลขนาดใหญ่',
                                                    description: null,
                                                    maxScore: 100,
                                                    score: 0,
                                                    status: 'TIME_LIMIT_EXCEEDED',
                                                    passedCount: 0,
                                                    totalCount: 3,
                                                    executedCount: 1,
                                                    skippedCount: 2,
                                                    executionTimeMs: 1000,
                                                    memoryUsedKb: 1024,
                                                  },
                                                ],
                                              }
                                            : submission
                                          : path === '/competitions/c1/join'
                                            ? ((joined = true), {})
                                            : path === '/competitions/c1'
                                              ? {
                                                  ...competition,
                                                  joined,
                                                  participants: joined
                                                    ? [{ joinedAt: new Date().toISOString() }]
                                                    : [],
                                                }
                                              : path === '/competitions/c1/leaderboard'
                                                ? { entries: [] }
                                                : path === '/competitions'
                                                  ? [competition]
                                                  : path === '/settings'
                                                    ? options.method === 'PATCH'
                                                      ? {
                                                          playgroundEnabled: (playgroundEnabled = JSON.parse(
                                                            options.body as string,
                                                          ).playgroundEnabled),
                                                          updatedAt: new Date().toISOString(),
                                                        }
                                                      : { playgroundEnabled, updatedAt: null }
                                                    : path === '/playground/run'
                                                      ? {
                                                          status: 'ACCEPTED',
                                                          stdout: 'hello\n',
                                                          stderr: '',
                                                          compilerOutput: '',
                                                          message: '',
                                                          executionTimeMs: 8,
                                                          memoryUsedKb: 1024,
                                                        }
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
  it('shows total scores on Home', async () => {
    mount('/');
    expect(await screen.findByRole('heading', { name: 'อันดับคะแนนรวม' })).toBeInTheDocument();
    expect(await screen.findByText(/อันดับของคุณ/)).toHaveTextContent('100 คะแนน');
  });
  it('requires acceptance before loading protected pages', async () => {
    privacyRequired = true;
    mount('/');
    expect(await screen.findByRole('heading', { name: 'อันดับคะแนนรวม' })).toBeInTheDocument();
    const consent = requests.findIndex((row) => row.path === '/auth/consent');
    expect(consent).toBeGreaterThan(-1);
    expect(requests.findIndex((row) => row.path === '/leaderboard')).toBeGreaterThan(consent);
    expect(JSON.parse(requests[consent].options.body as string)).toEqual({
      accepted: true,
      version: '2026-10-09-v1',
    });
  });
  it('declining privacy signs out without loading member data', async () => {
    privacyRequired = true;
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false, isDenied: false, isDismissed: true });
    mount('/');
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(requests.some((row) => row.path === '/leaderboard' || row.path === '/auth/consent')).toBe(false);
    expect(tokenStore.get()).toBeNull();
  });
  it('lets admins block members and inspect usage IPs', async () => {
    role = 'ADMIN';
    mount('/admin/members');
    await userEvent.click(await screen.findByRole('button', { name: 'บล็อก', exact: true }));
    await waitFor(() => expect(requests.some((row) => row.path.endsWith('/status'))).toBe(true));
    expect(JSON.parse(requests.find((row) => row.path.endsWith('/status'))!.options.body as string)).toEqual({
      isActive: false,
    });
    await userEvent.click(await screen.findByRole('link', { name: 'ดูประวัติการใช้งาน' }));
    expect(await screen.findByText('203.0.113.10')).toBeInTheDocument();
  });
  it('groups submissions by problem and opens its history', async () => {
    mount('/submissions');
    await userEvent.click(await screen.findByRole('link', { name: 'ดูประวัติ' }));
    expect(await screen.findByRole('link', { name: 'ดูผลและโค้ด' })).toBeInTheDocument();
    expect(requests.some((row) => row.path === '/submissions/me/problems/p1')).toBe(true);
  });
  it('lets admins browse respondents and reset only the selected user', async () => {
    role = 'ADMIN';
    mount('/admin/submissions/problems/p1');
    await userEvent.click(await screen.findByRole('button', { name: `รีเซ็ตคะแนน ${user.displayName}` }));
    await waitFor(() => expect(requests.some((row) => row.path.endsWith('/reset'))).toBe(true));
    expect(JSON.parse(requests.find((row) => row.path.endsWith('/reset'))!.options.body as string)).toEqual({
      userId: user.id,
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('ของผู้เรียนคนนี้') }),
    );
  });
  it('opens a respondents history and source code for admins', async () => {
    role = 'ADMIN';
    mount('/admin/submissions/problems/p1');
    await userEvent.click(await screen.findByRole('link', { name: 'ดูประวัติและโค้ด' }));
    await userEvent.click(await screen.findByRole('link', { name: 'ดูผลและโค้ด' }));
    expect(await screen.findByText(submission.sourceCode!)).toBeInTheDocument();
  });
  it('keeps the session when logout confirmation is cancelled', async () => {
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false, isDenied: false, isDismissed: true });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'ออกจากระบบ' }));
    expect(tokenStore.get()).toBe('session-test-token');
  });
  it('shows grouped verdicts and skipped counts without individual test results', async () => {
    groupedSubmission = true;
    mount('/submissions/s1');
    expect(await screen.findByRole('heading', { name: 'ผลตรวจราย Subtask' })).toBeInTheDocument();
    expect(screen.getByText('ข้อมูลขนาดใหญ่')).toBeInTheDocument();
    expect(screen.getByText(/ข้าม 2 เทสหลังไม่ผ่าน/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ผลตรวจรายเทสเคส' })).not.toBeInTheDocument();
    expect(screen.queryByText('ดู output')).not.toBeInTheDocument();
  });
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
  it('lets an admin enable the playground from system settings', async () => {
    role = 'ADMIN';
    mount('/admin/settings');
    await userEvent.click(await screen.findByRole('switch', { name: 'เปิด Playground' }));
    expect(await screen.findByRole('switch', { name: 'ปิด Playground' })).toBeChecked();
    const request = requests.find((item) => item.path === '/settings' && item.options.method === 'PATCH');
    expect(JSON.parse(request?.options.body as string)).toEqual({ playgroundEnabled: true });
  });
  it('runs playground code with stdin and displays stdout', async () => {
    playgroundEnabled = true;
    mount('/playground');
    const editor = await screen.findByRole('textbox', { name: 'ตัวแก้ไขโค้ด Playground' });
    await userEvent.clear(editor);
    await userEvent.type(editor, 'print(input())');
    await userEvent.type(screen.getByRole('textbox', { name: 'ข้อมูลนำเข้า Playground' }), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'รัน Python' }));
    await waitFor(() => expect(document.querySelector('.playground-output pre')).toHaveTextContent('hello'));
    const request = requests.find((item) => item.path === '/playground/run');
    expect(JSON.parse(request?.options.body as string)).toEqual({
      language: 'PYTHON',
      sourceCode: 'print(input())',
      stdin: 'hello',
    });
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
