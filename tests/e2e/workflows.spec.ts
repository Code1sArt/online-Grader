import { test, expect, type Page } from '@playwright/test';
import { user, problem, submission, competition } from '../fixtures';
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
            : path === '/api/submissions/me'
              ? [submission]
              : path === '/api/submissions'
                ? { id: 's1', status: 'QUEUED' }
                : path === '/api/submissions/s1'
                  ? submission
                  : path === '/api/competitions'
                    ? [competition]
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
  await page.getByLabel('ภาษาสำหรับส่งคำตอบ').selectOption('PYTHON');
  await page.locator('.cm-content').fill('print(5)');
  await expect(page.locator('.cm-content')).toHaveText('print(5)');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/editor-${info.project.name}.png`, fullPage: true });
  const request = page.waitForRequest(
    (r) => new URL(r.url()).pathname === '/api/submissions' && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'ส่งคำตอบ', exact: true }).click();
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
  await page.getByRole('button', { name: 'สมัครเข้าร่วม', exact: true }).click();
  await expect(page.getByRole('link', { name: 'ทำโจทย์', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/competition-${info.project.name}.png`, fullPage: true });
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'เปิดเมนู', exact: true }).click();
  await page.getByRole('link', { name: 'การส่งคำตอบ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'การส่งคำตอบ', exact: true })).toBeVisible();
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
  await expect(page.getByRole('alert')).toHaveText('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
  expect(posts).toHaveLength(0);
  await page.getByLabel('เวลาสิ้นสุด (เวลาท้องถิ่นของอุปกรณ์)').fill('2026-10-05T10:00');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/create-competition-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'สร้างการแข่งขัน', exact: true }).click();
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
