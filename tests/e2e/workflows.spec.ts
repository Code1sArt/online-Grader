import { test, expect, type Page } from '@playwright/test';
import { user, problem, submission, competition } from '../fixtures';
async function confirmIfVisible(page: Page) {
  if (await page.locator('.swal2-popup').isVisible()) await page.locator('.swal2-confirm').click();
}
async function mockApi(page: Page, admin = false) {
  let joined = false;
  await page.addInitScript(() => sessionStorage.setItem('nr-grader-session', 'e2e-only-no-server-access'));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data =
      path === '/api/auth/me'
        ? { ...user, role: admin ? 'ADMIN' : 'USER' }
        : path === '/api/problems'
          ? [
              problem,
              { ...problem, id: 'p2', slug: 'find-maximum', title: 'ค้นหาค่ามากที่สุด', difficulty: 2 },
              { ...problem, id: 'p3', slug: 'balanced-brackets', title: 'วงเล็บที่สมดุล', difficulty: 3 },
              { ...problem, id: 'p4', slug: 'shortest-path', title: 'เส้นทางที่สั้นที่สุด', difficulty: 4 },
            ]
          : path === '/api/problems/p1'
            ? problem
            : path === '/api/submissions/me/problems' || path === '/api/submissions/admin/problems'
              ? [
                  {
                    problem,
                    userCount: 1,
                    submissionCount: 2,
                    bestScore: 100,
                    lastSubmittedAt: submission.submittedAt,
                  },
                ]
              : path === '/api/submissions/admin/problems/p1'
                ? {
                    problem,
                    respondents: [
                      { user, bestScore: 100, submissionCount: 2, lastSubmittedAt: submission.submittedAt },
                    ],
                  }
                : path === '/api/submissions/me/problems/p1' ||
                    path === '/api/submissions/admin/problems/p1/users/test-user'
                  ? { problem, user, items: [submission], total: 1, page: 1, pageSize: 50 }
                  : path === '/api/submissions/admin/problems/p1/reset'
                    ? { resetCount: 2 }
                    : path === '/api/submissions/me'
                      ? [submission]
                      : path === '/api/submissions'
                        ? { id: 's1', status: 'QUEUED' }
                        : path === '/api/submissions/s1'
                          ? submission
                          : path === '/api/competitions'
                            ? [competition]
                            : path === '/api/settings'
                              ? { playgroundEnabled: true, updatedAt: null }
                              : path === '/api/playground/run'
                                ? {
                                    status: 'ACCEPTED',
                                    stdout: 'hello\n',
                                    stderr: '',
                                    compilerOutput: '',
                                    message: '',
                                    executionTimeMs: 8,
                                    memoryUsedKb: 1024,
                                  }
                                : path === '/api/competitions/c1/join'
                                  ? ((joined = true), {})
                                  : path === '/api/competitions/c1'
                                    ? { ...competition, joined }
                                    : path === '/api/competitions/c1/leaderboard'
                                      ? { entries: [] }
                                      : path === '/api/problems/p1/test-cases'
                                        ? {}
                                        : undefined;
    if (data === undefined) {
      await route.fulfill({ status: 404, json: { message: `Unexpected fixture endpoint ${path}` } });
      return;
    }
    await route.fulfill({ json: data });
  });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}
test('login is responsive', async ({ page }, info) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /พร้อมสำหรับโจทย์/ })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/login-${info.project.name}.png`, fullPage: true });
});
test('problem library, real editor, submission and result', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockApi(page);
  await page.goto('/problems');
  await expect(page.getByRole('link', { name: problem.title, exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/library-${info.project.name}.png`, fullPage: true });
  await page.getByLabel('ค้นหาโจทย์').fill('ผลรวม');
  await page.getByRole('link', { name: problem.title, exact: true }).click();
  await confirmIfVisible(page);
  await page.getByLabel('ภาษาสำหรับส่งคำตอบ').selectOption('PYTHON');
  await page.locator('.cm-content').fill('print(5)');
  await expect(page.locator('.cm-content')).toHaveText('print(5)');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/editor-${info.project.name}.png`, fullPage: true });
  const request = page.waitForRequest(
    (r) => new URL(r.url()).pathname === '/api/submissions' && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'ส่งคำตอบ', exact: true }).click();
  await confirmIfVisible(page);
  expect((await request).postDataJSON()).toEqual({
    problemId: 'p1',
    language: 'PYTHON',
    sourceCode: 'print(5)',
  });
  await expect(page.getByRole('heading', { name: 'ผลตรวจรายเทสเคส' })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/result-${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});
test('admin uploads real multipart files', async ({ page }, info) => {
  await mockApi(page, true);
  await page.goto('/admin/problems/p1');
  await page.getByLabel('ชื่อเทสเคส', { exact: true }).fill('Test upload');
  await page
    .getByLabel(/ไฟล์ข้อมูลนำเข้า/)
    .setInputFiles({ name: 'test.in', mimeType: 'text/plain', buffer: Buffer.from('2 3') });
  await page
    .getByLabel(/ไฟล์คำตอบ/)
    .setInputFiles({ name: 'test.sol', mimeType: 'text/plain', buffer: Buffer.from('5') });
  await page.getByLabel('แสดงเป็นตัวอย่างให้ผู้เรียนเห็น').check();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/admin-${info.project.name}.png`, fullPage: true });
  const request = page.waitForRequest((r) => r.url().endsWith('/test-cases') && r.method() === 'POST');
  await page.getByRole('button', { name: 'เพิ่มเทสเคส', exact: true }).click();
  await confirmIfVisible(page);
  const upload = await request;
  expect(upload.headers()['content-type']).toContain('multipart/form-data; boundary=');
  expect(upload.postData()).toContain('filename="test.in"');
  expect(upload.postData()).toContain('filename="test.sol"');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('competition join and responsive mobile navigation', async ({ page }, info) => {
  await mockApi(page);
  await page.goto('/competitions');
  await page.getByRole('link', { name: /NR Coding Challenge/ }).click();
  await confirmIfVisible(page);
  await page.getByRole('button', { name: 'สมัครเข้าร่วม', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('link', { name: 'ทำโจทย์', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/competition-${info.project.name}.png`, fullPage: true });
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'เปิดเมนู', exact: true }).click();
  await confirmIfVisible(page);
  await page.getByRole('link', { name: 'การส่งคำตอบ', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('heading', { name: 'การส่งคำตอบ', exact: true })).toBeVisible();
});

test('playground runs code with custom stdin', async ({ page }, info) => {
  await mockApi(page);
  await page.goto('/playground');
  await expect(page.getByRole('heading', { name: 'Playground', exact: true })).toBeVisible();
  await page.locator('.cm-content').fill('print(input())');
  await page.getByLabel('ข้อมูลนำเข้า Playground').fill('hello');
  const request = page.waitForRequest(
    (item) => new URL(item.url()).pathname === '/api/playground/run' && item.method() === 'POST',
  );
  await page.getByRole('button', { name: 'รัน Python', exact: true }).click();
  await confirmIfVisible(page);
  expect((await request).postDataJSON()).toEqual({
    language: 'PYTHON',
    sourceCode: 'print(input())',
    stdin: 'hello',
  });
  await expect(page.getByText('hello', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/playground-${info.project.name}.png`, fullPage: true });
});

test('admin creates a problem and opens its testcase editor', async ({ page }) => {
  await mockApi(page, true);
  let created = { ...problem };
  await page.route('**/api/problems', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    created = { ...problem, ...route.request().postDataJSON(), status: 'DRAFT', testCases: [] };
    await route.fulfill({ status: 201, json: created });
  });
  await page.route('**/api/problems/p1', (route) => route.fulfill({ json: created }));
  await page.goto('/admin/problems/new');
  await page.getByLabel('ชื่อโจทย์', { exact: true }).fill('Count numbers');
  await page.getByLabel(/รหัสโจทย์/).fill('count-numbers');
  await page.getByLabel(/เนื้อหาโจทย์/).fill('Count integers in the input.');
  await page.getByLabel('Time Limit (ms)').fill('2000');
  await page.getByLabel('Memory Limit (MB)').fill('256');
  await page.getByLabel('คะแนนเต็ม', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'บันทึกโจทย์', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('heading', { name: 'แก้ไขโจทย์', exact: true })).toBeVisible();
  await expect(page.getByLabel('ชื่อโจทย์', { exact: true })).toHaveValue('Count numbers');
  await expect(page.getByRole('button', { name: 'เพิ่มเทสเคส', exact: true })).toBeVisible();
  expect(created).toMatchObject({
    slug: 'count-numbers',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    maxScore: 50,
    allowedLanguages: ['CPP', 'PYTHON'],
  });
});

test('competition creation validates dates and sends weighted scores', async ({ page }, info) => {
  await mockApi(page, true);
  const posts: unknown[] = [];
  await page.route('**/api/competitions', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { ...competition, status: 'DRAFT' } });
  });
  await page.goto('/admin/competitions/new');
  await page.getByLabel('ชื่อการแข่งขัน', { exact: true }).fill('New challenge');
  await page.getByLabel('เวลาเริ่ม (เวลาท้องถิ่นของอุปกรณ์)').fill('2026-10-05T09:00');
  await page.getByLabel('เวลาสิ้นสุด (เวลาท้องถิ่นของอุปกรณ์)').fill('2026-10-05T08:00');
  await page.getByRole('checkbox', { name: /ผลรวมของจำนวนเต็ม/ }).check();
  await page.getByLabel('คะแนนของ ผลรวมของจำนวนเต็ม').fill('250');
  await page.getByRole('button', { name: 'สร้างการแข่งขัน', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('alert')).toHaveText('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
  expect(posts).toHaveLength(0);
  await page.getByLabel('เวลาสิ้นสุด (เวลาท้องถิ่นของอุปกรณ์)').fill('2026-10-05T10:00');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/create-competition-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'สร้างการแข่งขัน', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('heading', { name: 'จัดการแข่งขัน', exact: true })).toBeVisible();
  expect(posts).toEqual([
    {
      title: 'New challenge',
      description: '',
      startsAt: '2026-10-05T02:00:00.000Z',
      endsAt: '2026-10-05T03:00:00.000Z',
      problems: [{ problemId: 'p1', score: 250 }],
    },
  ]);
});

test('invalid upload is rejected without sending it to the API', async ({ page }) => {
  await mockApi(page, true);
  const uploads: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/test-cases')) uploads.push(request.method());
  });
  await page.goto('/admin/problems/p1');
  await page.getByLabel('ชื่อเทสเคส', { exact: true }).fill('Wrong extension');
  await page
    .getByLabel(/ไฟล์ข้อมูลนำเข้า/)
    .setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('2 3') });
  await page
    .getByLabel(/ไฟล์คำตอบ/)
    .setInputFiles({ name: 'ok.sol', mimeType: 'text/plain', buffer: Buffer.from('5') });
  await page.getByRole('button', { name: 'เพิ่มเทสเคส', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('alert')).toContainText('ไฟล์ .in');
  expect(uploads).toEqual([]);
});

test('queued submissions update automatically to their final result', async ({ page }) => {
  await mockApi(page);
  let polls = 0;
  await page.route('**/api/submissions/s1', (route) => {
    polls += 1;
    return route.fulfill({
      json:
        polls < 3
          ? {
              ...submission,
              status: polls === 1 ? 'QUEUED' : 'JUDGING',
              results: [],
              score: '0',
              passedCount: 0,
            }
          : submission,
    });
  });
  await page.goto('/submissions/s1');
  await expect(page.getByRole('status')).toContainText('กำลังตรวจคำตอบ');
  await expect(page.getByText('ผ่านทุกเทส', { exact: true })).toHaveCount(2, { timeout: 10000 });
  expect(polls).toBe(3);
});

test('speed leaderboard shows podium, profile photos and resilient fallbacks', async ({ page }, info) => {
  await mockApi(page);
  const avatar = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#4b8d75"/><circle cx="50" cy="38" r="19" fill="#f2d4a5"/><path d="M15 100 Q15 60 50 60 Q85 60 85 100" fill="#d5fb70"/></svg>')}`;
  const entries = [
    {
      rank: 1,
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: avatar,
      totalScore: 300,
      completionTimeMs: 91000,
      executionTimeMs: 23,
      memoryUsedKb: 8192,
      solvedCount: 3,
    },
    {
      rank: 2,
      userId: 'racer-2',
      displayName: 'สายฟ้า โค้ดไว',
      avatarUrl: null,
      totalScore: 280,
      completionTimeMs: 125000,
      executionTimeMs: 42,
      memoryUsedKb: 9216,
      solvedCount: 2,
    },
    {
      rank: 3,
      userId: 'racer-3',
      displayName: 'นักแข่งผู้ไม่ยอมแพ้และพร้อมท้าชิงทุกสนาม',
      avatarUrl: '/missing-avatar.png',
      totalScore: 250,
      completionTimeMs: 185000,
      executionTimeMs: 65,
      memoryUsedKb: 10240,
      solvedCount: 2,
    },
    {
      rank: 4,
      userId: 'racer-4',
      displayName: 'ผู้ท้าชิงหน้าใหม่',
      avatarUrl: null,
      totalScore: 0,
      completionTimeMs: Number.MAX_SAFE_INTEGER,
      executionTimeMs: Number.MAX_SAFE_INTEGER,
      memoryUsedKb: Number.MAX_SAFE_INTEGER,
      solvedCount: 0,
    },
  ];
  let refreshes = 0;
  await page.route('**/api/competitions/c1/leaderboard', (route) => {
    refreshes += 1;
    return route.fulfill({ json: { competitionId: 'c1', generatedAt: new Date().toISOString(), entries } });
  });
  await page.goto('/competitions/c1');
  await expect(page.getByRole('heading', { name: 'เจ้าแห่งความเร็ว' })).toBeVisible();
  await expect(page.locator('.speed-podium-card')).toHaveCount(3);
  await expect(page.getByRole('columnheader', { name: 'เวลาส่งคำตอบ' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'เวลาโปรแกรมรวม' })).toBeVisible();
  await expect(page.locator('.speed-podium-card.place-1')).toContainText('23 ms');
  await expect(page.locator('.speed-podium-card.place-1')).toContainText('8,192 KB');
  await expect(page.locator('.speed-current-user')).toContainText(user.displayName);
  await expect(page.locator('.speed-podium img')).toHaveAttribute('src', avatar);
  await expect(page.locator('.speed-podium img')).toHaveJSProperty('naturalWidth', 100);
  await expect(page.locator('.place-3 .racer-avatar')).toContainText('น');
  await expect(page.locator('.speed-table tbody tr').last()).toContainText('—');
  await noOverflow(page);
  await page
    .locator('.speed-leaderboard')
    .screenshot({ path: `test-results/speed-leaderboard-${info.project.name}.png` });
  await page.getByRole('button', { name: 'รีเฟรชอันดับ' }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.speed-podium-card')).toHaveCount(3);
  expect(refreshes).toBe(2);
  entries.splice(1);
  await page.getByRole('button', { name: 'รีเฟรชอันดับ' }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.speed-podium-card')).toHaveCount(1);
  entries.splice(0);
  await page.getByRole('button', { name: 'รีเฟรชอันดับ' }).click();
  await confirmIfVisible(page);
  await expect(page.getByText('สนามพร้อมแล้ว รอผู้ท้าชิงคนแรก')).toBeVisible();
});

test('admin configures subtasks, assigns tests and uploads group members', async ({ page }, info) => {
  await mockApi(page, true);
  const state = {
    ...problem,
    status: 'DRAFT',
    scoringEditable: true,
    subtasks: [] as { id: string; name: string; score: number; position: number; description: string }[],
    testCases: [{ ...problem.testCases![0], subtaskId: null as string | null }],
  };
  await page.route('**/api/problems/p1', (route) => route.fulfill({ json: state }));
  await page.route('**/api/problems/p1/subtasks', async (route) => {
    const group = { ...route.request().postDataJSON(), id: `g${state.subtasks.length + 1}` };
    state.subtasks.push(group);
    await route.fulfill({ json: group });
  });
  await page.route('**/api/problems/p1/subtasks/g1', async (route) => {
    Object.assign(state.subtasks[0], route.request().postDataJSON());
    await route.fulfill({ json: state.subtasks[0] });
  });
  await page.route('**/api/problems/p1/test-cases/t1', async (route) => {
    Object.assign(state.testCases[0], route.request().postDataJSON());
    await route.fulfill({ json: state.testCases[0] });
  });
  await page.goto('/admin/problems/p1');
  await page.getByLabel('ชื่อ subtask', { exact: true }).fill('ข้อมูลเล็ก');
  await page.getByLabel('เงื่อนไขข้อมูลของ subtask').fill('n ≤ 100');
  await page.getByRole('button', { name: 'เพิ่ม subtask', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.subtask-card')).toHaveCount(1);
  await page.getByLabel('ชื่อ subtask', { exact: true }).fill('ข้อมูลใหญ่');
  await page.getByLabel('คะแนน subtask', { exact: true }).fill('80');
  await page.getByLabel('เงื่อนไขข้อมูลของ subtask').fill('n ≤ 200,000');
  await page.getByRole('button', { name: 'เพิ่ม subtask', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.subtask-card')).toHaveCount(2);
  await page.getByLabel('Subtask ของ ตัวอย่าง', { exact: true }).selectOption('g1');
  await page.getByRole('button', { name: 'บันทึกกลุ่มของ ตัวอย่าง' }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.subtask-card').first()).toContainText('1 เทส');
  expect(state.testCases[0].score).toBe(0);
  await page.getByLabel('Subtask ของเทสนี้', { exact: true }).selectOption('g2');
  await expect(page.getByLabel('คะแนนเทสนี้', { exact: true })).toBeDisabled();
  await page.getByLabel('ชื่อเทสเคส', { exact: true }).fill('ข้อมูลใหญ่ 1');
  await page
    .getByLabel(/ไฟล์ข้อมูลนำเข้า/)
    .setInputFiles({ name: 'large.in', mimeType: 'text/plain', buffer: Buffer.from('100000') });
  await page
    .getByLabel(/ไฟล์คำตอบ/)
    .setInputFiles({ name: 'large.sol', mimeType: 'text/plain', buffer: Buffer.from('100000') });
  await page.route('**/api/problems/p1/test-cases', async (route) => {
    const body = route.request().postData()!;
    expect(body).toContain('name="subtaskId"\r\n\r\ng2');
    expect(body).toContain('name="score"\r\n\r\n0');
    state.testCases.push({
      ...state.testCases[0],
      id: 't2',
      name: 'ข้อมูลใหญ่ 1',
      isSample: false,
      subtaskId: 'g2',
      position: 2,
    });
    await route.fulfill({ json: state.testCases[1] });
  });
  await page.getByRole('button', { name: 'เพิ่มเทสเคส', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.subtask-card').nth(1)).toContainText('1 เทส');
  await expect(page.getByText('100 / 100 คะแนน', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'แก้ไข subtask ข้อมูลเล็ก' }).click();
  await confirmIfVisible(page);
  await page.getByLabel('เงื่อนไขข้อมูลของ subtask').fill('1 ≤ n ≤ 100');
  await page.getByRole('button', { name: 'บันทึก subtask', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.locator('.subtask-card').first()).toContainText('1 ≤ n ≤ 100');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/subtasks-admin-${info.project.name}.png`, fullPage: true });
  await page.goto('/problems/p1');
  await expect(page.getByRole('heading', { name: 'Subtasks / กลุ่มคะแนน' })).toBeVisible();
  await expect(page.locator('.subtask-card')).toHaveCount(2);
  await noOverflow(page);
});

test('submission shows all-or-nothing subtask scores and group performance', async ({ page }, info) => {
  await mockApi(page);
  await page.route('**/api/submissions/s1', (route) =>
    route.fulfill({
      json: {
        ...submission,
        status: 'PARTIAL',
        score: 20,
        passedCount: 2,
        totalCount: 3,
        subtaskResults: [
          {
            subtaskId: 'g1',
            name: 'ข้อมูลเล็ก',
            description: 'n ≤ 100',
            maxScore: 20,
            score: 20,
            status: 'ACCEPTED',
            passedCount: 1,
            totalCount: 1,
            executionTimeMs: 10,
            memoryUsedKb: 2048,
          },
          {
            subtaskId: 'g2',
            name: 'ข้อมูลใหญ่',
            description: 'n ≤ 200,000',
            maxScore: 80,
            score: 0,
            status: 'TIME_LIMIT_EXCEEDED',
            passedCount: 1,
            totalCount: 2,
            executionTimeMs: 1020,
            memoryUsedKb: 8192,
          },
        ],
        results: [{ ...submission.results![0], subtaskId: 'g1', score: 0 }],
      },
    }),
  );
  await page.goto('/submissions/s1');
  await expect(page.getByRole('heading', { name: 'ผลตรวจราย Subtask' })).toBeVisible();
  const cards = page.locator('.subtask-card');
  await expect(cards.first()).toContainText('20 / 20 คะแนน');
  await expect(cards.nth(1)).toContainText('0 / 80 คะแนน');
  await expect(cards.nth(1)).toContainText('ตรวจ 2 / 2 เทส');
  await expect(cards.nth(1)).toContainText('1,020 ms รวม');
  await expect(cards.nth(1)).toContainText('8,192 KB สูงสุด');
  await expect(page.getByRole('heading', { name: 'ผลตรวจรายเทสเคส' })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/subtasks-result-${info.project.name}.png`, fullPage: true });
});

test('admin bulk imports a ZIP into a subtask and preserves errors without adding partial tests', async ({
  page,
}, info) => {
  await mockApi(page, true);
  const state = {
    ...problem,
    status: 'DRAFT',
    scoringEditable: true,
    subtasks: [{ id: 'g1', name: 'ข้อมูลเล็ก', score: 100, position: 1, description: 'n ≤ 100' }],
    testCases: [{ ...problem.testCases![0], score: 0, subtaskId: null as string | null }],
  };
  await page.route('**/api/problems/p1', (route) => route.fulfill({ json: state }));
  let imports = 0;
  await page.route('**/api/problems/p1/test-cases/zip', async (route) => {
    imports += 1;
    expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
    expect(route.request().postData()).toContain('name="subtaskId"\r\n\r\ng1');
    expect(route.request().postData()).toContain('filename="subtask-cases.zip"');
    if (imports === 1) {
      await route.fulfill({ status: 400, json: { message: 'เทส 02 ต้องมีไฟล์ .in และ .sol ชื่อเดียวกัน' } });
      return;
    }
    for (let i = 1; i <= 2; i++)
      state.testCases.push({
        ...state.testCases[0],
        id: `zip-${i}`,
        name: `0${i}`,
        position: i + 1,
        subtaskId: 'g1',
        isSample: false,
      });
    await route.fulfill({ json: { count: 2, subtaskId: 'g1', startPosition: 2 } });
  });
  await page.goto('/admin/problems/p1');
  await page.getByLabel('Subtask สำหรับ ZIP', { exact: true }).selectOption('g1');
  await page.getByLabel(/ไฟล์ ZIP ของชุดทดสอบ/).setInputFiles('tests/fixtures/subtask-cases.zip');
  await page.getByRole('button', { name: 'นำเข้า ZIP เข้า subtask', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('alert')).toContainText('เทส 02 ต้องมีไฟล์');
  expect(state.testCases).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'นำเข้า ZIP เข้า subtask', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'นำเข้า ZIP เข้า subtask', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('status')).toContainText('เพิ่ม 2 เทสจาก ZIP เข้า subtask แล้ว');
  await expect(page.locator('.subtask-card')).toContainText('2 เทส');
  expect(state.testCases).toHaveLength(3);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await noOverflow(page);
  await page
    .locator('.zip-test-upload')
    .screenshot({ path: `test-results/subtask-zip-${info.project.name}.png` });
  await page
    .getByLabel(/ไฟล์ ZIP ของชุดทดสอบ/)
    .setInputFiles({ name: 'not-zip.in', mimeType: 'text/plain', buffer: Buffer.from('1') });
  await page.getByLabel('Subtask สำหรับ ZIP', { exact: true }).selectOption('g1');
  await page.getByRole('button', { name: 'นำเข้า ZIP เข้า subtask', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('alert')).toContainText('ไฟล์ต้องเป็น .zip');
  expect(imports).toBe(2);
});

test('admin selects multiple test cases to publish examples without changing scoring', async ({
  page,
}, info) => {
  await mockApi(page, true);
  const state = {
    ...problem,
    scoringEditable: false,
    subtasks: [{ id: 'g1', name: 'กลุ่มทดสอบ', position: 1, score: 100, description: 'n ≤ 100' }],
    testCases: ['เล็ก', 'กลาง', 'ใหญ่'].map((name, index) => ({
      ...problem.testCases![0],
      id: `t${index + 1}`,
      name,
      position: index + 1,
      isSample: false,
      subtaskId: 'g1',
      score: 0,
    })),
  };
  await page.route('**/api/problems/p1', (route) => route.fulfill({ json: state }));
  let attempts = 0;
  await page.route('**/api/problems/p1/test-cases/samples', async (route) => {
    attempts += 1;
    const payload = route.request().postDataJSON() as { testCaseIds: string[]; isSample: boolean };
    if (attempts === 1) {
      await route.fulfill({ status: 400, json: { message: 'บันทึกไม่ได้ กรุณาลองอีกครั้ง' } });
      return;
    }
    if (attempts === 2) expect(payload).toEqual({ testCaseIds: ['t1', 't2'], isSample: true });
    state.testCases.forEach((test) => {
      if (payload.testCaseIds.includes(test.id)) test.isSample = payload.isSample;
    });
    await route.fulfill({ json: { count: payload.testCaseIds.length, isSample: payload.isSample } });
  });
  await page.goto('/admin/problems/p1');
  const publish = page.getByRole('button', { name: 'ตั้งเป็นตัวอย่าง', exact: true });
  await expect(publish).toBeDisabled();
  await page.getByRole('checkbox', { name: 'เลือกเทส เล็ก', exact: true }).check();
  await page.getByRole('checkbox', { name: 'เลือกเทส กลาง', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'เลือกเทสทั้งหมด', exact: true })).toHaveJSProperty(
    'indeterminate',
    true,
  );
  await publish.click();
  await confirmIfVisible(page);
  await expect(page.getByRole('alert')).toContainText('บันทึกไม่ได้');
  await expect(page.getByRole('checkbox', { name: 'เลือกเทส เล็ก', exact: true })).toBeChecked();
  await publish.click();
  await confirmIfVisible(page);
  await expect(page.getByText('ตัวอย่างเผยแพร่', { exact: true })).toHaveCount(2);
  await expect(page.getByText('เทสลับ', { exact: true })).toHaveCount(1);
  await expect(publish).toBeDisabled();
  expect(state.testCases.every((test) => test.subtaskId === 'g1' && test.score === 0)).toBe(true);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/test-case-samples-${info.project.name}.png`, fullPage: true });
  await page.goto('/problems/p1');
  await expect(page.getByRole('heading', { name: 'ตัวอย่างที่ 2', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ตัวอย่างที่ 3', exact: true })).toHaveCount(0);
  await page.goto('/admin/problems/p1');
  await page.getByRole('checkbox', { name: 'เลือกเทสทั้งหมด', exact: true }).check();
  await page.getByRole('button', { name: 'ตั้งเป็นเทสลับ', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByText('เทสลับ', { exact: true })).toHaveCount(3);
  await page.goto('/problems/p1');
  await expect(page.getByText('โจทย์นี้ไม่มีตัวอย่างเผยแพร่')).toBeVisible();
});

test('grouped submission history and admin respondents are responsive', async ({ page }, info) => {
  await mockApi(page, true);
  await page.goto('/submissions');
  await page.getByRole('link', { name: 'ดูประวัติ', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('link', { name: 'ดูผลและโค้ด' })).toBeVisible();
  await page.goto('/admin/submissions');
  await page.getByRole('link', { name: 'ดูผู้ตอบ', exact: true }).click();
  await confirmIfVisible(page);
  await expect(page.getByRole('button', { name: 'รีเซ็ตคะแนนทั้งข้อ' })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/respondents-${info.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'ดูประวัติและโค้ด' }).click();
  await confirmIfVisible(page);
  await page.getByRole('link', { name: 'ดูผลและโค้ด' }).click();
  await confirmIfVisible(page);
  await expect(page.getByText(submission.sourceCode!, { exact: true })).toBeVisible();
});

test('SweetAlert logout can be cancelled or confirmed', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('nr-grader-session', 'e2e-only-no-server-access'));
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: user }));
  await page.route('**/api/problems', (route) => route.fulfill({ json: [problem] }));
  await page.route('**/api/submissions/me', (route) => route.fulfill({ json: [] }));
  await page.goto('/problems');
  if (page.viewportSize()!.width < 768)
    await page.getByRole('button', { name: 'เปิดเมนู', exact: true }).click();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page.locator('.swal2-popup')).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(page).toHaveURL(/problems$/);
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page).toHaveURL(/login$/);
});

test('privacy acceptance gates the global leaderboard with a real popup', async ({ page }, info) => {
  await mockApi(page);
  let accepted = false;
  let boardCalls = 0;
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { ...user, requiresPrivacyAcceptance: !accepted } }),
  );
  await page.route('**/api/auth/privacy', (route) =>
    route.fulfill({
      json: {
        version: 'test-v1',
        title: 'ความเป็นส่วนตัวและเงื่อนไขการใช้งาน',
        paragraphs: ['ระบบเก็บประวัติ IP 90 วัน', 'ชื่อและคะแนนแสดงแก่สมาชิก'],
      },
    }),
  );
  await page.route('**/api/auth/consent', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ accepted: true, version: 'test-v1' });
    accepted = true;
    await route.fulfill({ json: { ...user, requiresPrivacyAcceptance: false } });
  });
  await page.route('**/api/leaderboard', async (route) => {
    boardCalls++;
    await route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        entries: [
          { userId: user.id, displayName: user.displayName, avatarUrl: null, totalScore: 170, rank: 1 },
        ],
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.privacy-popup')).toBeVisible();
  expect(boardCalls).toBe(0);
  await noOverflow(page);
  await page.getByRole('button', { name: 'ยอมรับเงื่อนไข', exact: true }).click();
  await expect(page.getByRole('heading', { name: /อันดับคะแนนรวม/ })).toBeVisible();
  await expect(page.locator('.speed-table')).toContainText('170');
  const scoreCell = await page.locator('.speed-table tbody td:last-child').boundingBox();
  expect(scoreCell!.x + scoreCell!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/home-${info.project.name}.png`, fullPage: true });
});

test('admin blocks members and inspects retained IP history', async ({ page }, info) => {
  await mockApi(page, true);
  let active = true;
  const member = () => ({
    ...user,
    isActive: active,
    deletedAt: null,
    privacyAcceptedAt: new Date().toISOString(),
    _count: { submissions: 2 },
    usage: { loginCount: 1, playgroundCount: 2, graderRunCount: 3 },
  });
  await page.route('**/api/members?**', (route) =>
    route.fulfill({ json: { items: [member()], total: 1, pageSize: 50 } }),
  );
  await page.route('**/api/members/test-user/status', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ isActive: false });
    active = false;
    await route.fulfill({ json: member() });
  });
  await page.route('**/api/members/test-user/history?**', (route) =>
    route.fulfill({
      json: {
        user: member(),
        items: [{ id: 'log1', kind: 'SUBMISSION', ip: '203.0.113.10', createdAt: new Date().toISOString() }],
        total: 1,
        pageSize: 50,
      },
    }),
  );
  await page.goto('/admin/members');
  await page.getByRole('button', { name: 'บล็อก', exact: true }).click();
  await expect(page.locator('.swal2-popup')).toBeVisible();
  await page.locator('.swal2-confirm').click();
  await expect(page.getByRole('button', { name: 'ปลดบล็อก', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'ดูประวัติการใช้งาน', exact: true }).click();
  await expect(page.getByText('203.0.113.10', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/member-history-${info.project.name}.png`, fullPage: true });
});

test('problem constraints preserve line breaks when saved and displayed', async ({ page }) => {
  await mockApi(page, true);
  let constraints = '1 ≤ N\nN ≤ 100';
  await page.route('**/api/problems/p1', async (route) => {
    if (route.request().method() === 'PATCH') constraints = route.request().postDataJSON().constraints;
    await route.fulfill({ json: { ...problem, constraints } });
  });
  await page.goto('/admin/problems/p1');
  await page
    .getByRole('textbox', { name: 'ข้อจำกัดของข้อมูล', exact: true })
    .fill('1 ≤ N\nN ≤ 1000\nA ≤ 5000');
  await page.getByRole('button', { name: 'บันทึกโจทย์', exact: true }).click();
  await expect(page.locator('.swal2-popup')).toBeVisible();
  await page.locator('.swal2-confirm').click();
  await expect.poll(() => constraints).toBe('1 ≤ N\nN ≤ 1000\nA ≤ 5000');
  await page.goto('/problems/p1');
  await expect(page.locator('.constraints-markdown')).toContainText('N ≤ 1000');
  await expect(page.locator('.constraints-markdown')).toHaveCSS('white-space', 'pre-line');
  await noOverflow(page);
});

test('admin deletes problems and competitions through confirmation', async ({ page }) => {
  await mockApi(page, true);
  let removedProblem = false;
  let removedCompetition = false;
  await page.route('**/api/problems', (route) => route.fulfill({ json: removedProblem ? [] : [problem] }));
  await page.route('**/api/problems/p1', async (route) => {
    expect(route.request().method()).toBe('DELETE');
    removedProblem = true;
    await route.fulfill({ json: { deleted: true } });
  });
  await page.route('**/api/competitions', (route) =>
    route.fulfill({ json: removedCompetition ? [] : [competition] }),
  );
  await page.route('**/api/competitions/c1', async (route) => {
    expect(route.request().method()).toBe('DELETE');
    removedCompetition = true;
    await route.fulfill({ json: { deleted: true } });
  });
  await page.goto('/admin/problems');
  await page.getByRole('button', { name: 'ลบโจทย์', exact: true }).click();
  await expect(page.locator('.swal2-popup')).toBeVisible();
  expect(removedProblem).toBe(false);
  await page.locator('.swal2-confirm').click();
  await expect(page.getByRole('button', { name: 'ลบโจทย์', exact: true })).toHaveCount(0);
  await page.goto('/admin/competitions');
  await page.getByRole('button', { name: 'ลบการแข่งขัน', exact: true }).click();
  await expect(page.locator('.swal2-popup')).toBeVisible();
  expect(removedCompetition).toBe(false);
  await page.locator('.swal2-confirm').click();
  await expect(page.getByRole('button', { name: 'ลบการแข่งขัน', exact: true })).toHaveCount(0);
});
