export type Language = 'CPP' | 'PYTHON';
export type Decimal = string | number;
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'USER';
}
export interface Session {
  accessToken: string;
  user: User;
}
export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  position: number;
  score?: Decimal;
  isSample?: boolean;
}
export interface Problem {
  id: string;
  slug: string;
  title: string;
  statement?: string;
  inputDescription?: string;
  outputDescription?: string;
  constraints?: string;
  difficulty: number;
  allowedLanguages: Language[];
  timeLimitMs: number;
  memoryLimitMb: number;
  maxScore: Decimal;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  testCases?: TestCase[];
}
export type Verdict =
  | 'QUEUED'
  | 'JUDGING'
  | 'ACCEPTED'
  | 'PARTIAL'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'SYSTEM_ERROR';
export interface Result {
  id: string;
  name: string;
  status: Verdict;
  score: Decimal;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  actualOutput?: string;
  errorOutput?: string;
}
export interface Submission {
  id: string;
  language: Language;
  status: Verdict;
  score: Decimal;
  passedCount: number;
  totalCount: number;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  submittedAt: string;
  judgedAt?: string;
  problem: Pick<Problem, 'id' | 'slug' | 'title' | 'maxScore'>;
  competitionId?: string | null;
  sourceCode?: string;
  compilerOutput?: string;
  systemMessage?: string;
  results?: Result[];
}
export interface Competition {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  joined?: boolean;
  participants: { joinedAt: string }[];
  _count?: { participants: number; problems: number };
  problems?: { problemId: string; score: Decimal; position: number; problem: Problem }[];
}
export interface Leaderboard {
  competitionId: string;
  generatedAt: string;
  entries: {
    rank: number;
    userId: string;
    displayName: string;
    totalScore: number;
    completionTimeMs: number;
    executionTimeMs: number;
    memoryUsedKb: number;
    solvedCount: number;
  }[];
}
