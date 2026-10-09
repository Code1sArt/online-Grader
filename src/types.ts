export type Language = 'CPP' | 'PYTHON';
export type Decimal = string | number;
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'USER';
  privacyVersion?: string | null;
  privacyAcceptedAt?: string | null;
  requiresPrivacyAcceptance?: boolean;
}
export interface Session {
  accessToken: string;
  user: User;
}
export interface SystemSettings {
  playgroundEnabled: boolean;
  updatedAt: string | null;
}
export interface PlaygroundRunResult {
  status: Verdict;
  stdout: string;
  stderr: string;
  compilerOutput: string;
  message: string;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
}
export interface Subtask {
  id: string;
  name: string;
  description: string | null;
  score: Decimal;
  position: number;
}
export interface SubtaskResult {
  subtaskId: string;
  name: string;
  description: string | null;
  maxScore: number;
  score: number;
  status: Verdict;
  passedCount: number;
  totalCount: number;
  executedCount?: number;
  skippedCount?: number;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
}
export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  position: number;
  score?: Decimal;
  isSample?: boolean;
  subtaskId?: string | null;
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
  subtasks?: Subtask[];
  scoringEditable?: boolean;
  deletedAt?: string | null;
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
  subtaskId?: string | null;
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
  scoreResetAt?: string | null;
  problem: Pick<Problem, 'id' | 'slug' | 'title' | 'maxScore' | 'deletedAt'>;
  competitionId?: string | null;
  competition?: { id: string; deletedAt: string | null } | null;
  sourceCode?: string;
  compilerOutput?: string;
  systemMessage?: string;
  results?: Result[];
  subtaskResults?: SubtaskResult[] | null;
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
    avatarUrl: string | null;
    totalScore: number;
    completionTimeMs: number;
    executionTimeMs: number;
    memoryUsedKb: number;
    solvedCount: number;
  }[];
}
