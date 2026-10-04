import type { Competition, Problem, Submission, User } from '../src/types';
export const user: User = {
  id: 'test-user',
  email: 'student@example.test',
  displayName: 'นักเรียน ทดสอบ',
  avatarUrl: null,
  role: 'USER',
};
export const problem: Problem = {
  id: 'p1',
  slug: 'a-plus-b',
  title: 'ผลรวมของจำนวนเต็ม',
  difficulty: 1,
  status: 'PUBLISHED',
  allowedLanguages: ['CPP', 'PYTHON'],
  timeLimitMs: 1000,
  memoryLimitMb: 128,
  maxScore: '100',
  statement: 'รับจำนวนเต็ม **A** และ **B** แล้วหาผลรวมของทั้งสองจำนวน',
  inputDescription: 'จำนวนเต็มสองจำนวน คั่นด้วยช่องว่าง',
  outputDescription: 'ผลรวม A + B',
  constraints: '−1,000 ≤ A, B ≤ 1,000',
  testCases: [
    {
      id: 't1',
      name: 'ตัวอย่าง',
      position: 1,
      input: '2 3\n',
      expectedOutput: '5\n',
      score: '100',
      isSample: true,
    },
  ],
};
export const submission: Submission = {
  id: 's1',
  language: 'PYTHON',
  status: 'ACCEPTED',
  problem,
  score: '100',
  passedCount: 1,
  totalCount: 1,
  executionTimeMs: 18,
  memoryUsedKb: 8192,
  submittedAt: '2026-10-04T08:00:00Z',
  sourceCode: 'print(sum(map(int,input().split())))',
  results: [
    {
      id: 'r1',
      name: 'ตัวอย่าง',
      status: 'ACCEPTED',
      score: '100',
      executionTimeMs: 18,
      memoryUsedKb: 8192,
      actualOutput: '5\n',
    },
  ],
};
export const competition: Competition = {
  id: 'c1',
  title: 'NR Coding Challenge',
  description: 'สนามฝึกทักษะการเขียนโปรแกรม',
  startsAt: new Date(Date.now() - 60000).toISOString(),
  endsAt: new Date(Date.now() + 3600000).toISOString(),
  status: 'PUBLISHED',
  participants: [],
  _count: { problems: 1, participants: 0 },
  problems: [{ problemId: problem.id, problem, score: '100', position: 1 }],
};
