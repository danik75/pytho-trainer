import type {
  AiSettings,
  DomainCatalogEntry,
  ExecutionResult,
  Exercise,
  ExamAttempt,
  ExerciseHelpMessage,
  LearningOverview,
  MasteryRecord,
  QuestionType,
  RoadmapEntry,
  RoadmapView,
  SessionDecision,
  StudySession,
  Submission,
  Topic,
  User,
} from '@pytho-trainer/shared';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Only declare a JSON content-type when there's actually a body - Fastify
  // rejects an empty body when Content-Type: application/json is set, which
  // several endpoints here hit (e.g. bodyless POSTs like createCurriculum).
  const headers = init?.body ? { 'Content-Type': 'application/json' } : undefined;
  const response = await fetch(path, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(response.status, body?.error?.message ?? `Request to ${path} failed`);
  }

  return response.json() as Promise<T>;
}

export function getUser(): Promise<User> {
  return request<User>('/api/user');
}

export function getDomainCatalog(): Promise<DomainCatalogEntry[]> {
  return request<DomainCatalogEntry[]>('/api/domains/catalog');
}

export interface OnboardingPayload {
  goals: string;
  selfAssessedLevel: string;
  diagnosticNotes: Record<string, unknown>;
  selectedDomains: string[];
}

export function submitOnboarding(payload: OnboardingPayload): Promise<User> {
  return request<User>('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createCurriculum(): Promise<{ curriculumId: string }> {
  return request<{ curriculumId: string }>('/api/curricula', { method: 'POST' });
}

export function getRoadmap(): Promise<RoadmapView> {
  return request<RoadmapView>('/api/roadmap');
}

export interface TopicDetail {
  topic: Topic;
  mastery: MasteryRecord | null;
}

export function getTopic(topicId: string): Promise<TopicDetail> {
  return request<TopicDetail>(`/api/topics/${topicId}`);
}

export interface StartTopicResult {
  session: StudySession;
  exercise: Exercise;
}

export function startTopic(topicId: string): Promise<StartTopicResult> {
  return request<StartTopicResult>(`/api/topics/${topicId}/start`, { method: 'POST' });
}

export function requestAdditionalPractice(topicId: string): Promise<StartTopicResult> {
  return request<StartTopicResult>(`/api/topics/${topicId}/practice`, { method: 'POST' });
}

export interface ResetTopicResult {
  mastery: MasteryRecord;
  roadmapEntry: RoadmapEntry;
}

export function resetTopic(topicId: string): Promise<ResetTopicResult> {
  return request<ResetTopicResult>(`/api/topics/${topicId}/reset`, { method: 'POST' });
}

export function getSession(sessionId: string): Promise<StudySession> {
  return request<StudySession>(`/api/sessions/${sessionId}`);
}

export function getCurrentExercise(sessionId: string): Promise<Exercise> {
  return request<Exercise>(`/api/sessions/${sessionId}/exercises/current`);
}

export interface TheorySessionResult {
  session: StudySession;
  examQuestions: ClientExamQuestion[];
}

export interface SubmitResult<TResult> {
  masteryRecord: MasteryRecord;
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
  result: TResult;
}

interface SubmitExerciseApiResponse {
  submission: Submission;
  masteryRecord: MasteryRecord;
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
}

export function runExerciseCode(exerciseId: string, code: string): Promise<ExecutionResult> {
  return request<ExecutionResult>(`/api/exercises/${exerciseId}/run`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function runSandboxCode(code: string): Promise<ExecutionResult> {
  return request<ExecutionResult>('/api/sandbox/run', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function submitExerciseCode(
  exerciseId: string,
  code: string,
): Promise<SubmitResult<Submission>> {
  const response = await request<SubmitExerciseApiResponse>(`/api/exercises/${exerciseId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  const { submission, ...rest } = response;
  return { ...rest, result: submission };
}

export function getExerciseHelp(exerciseId: string): Promise<ExerciseHelpMessage[]> {
  return request<ExerciseHelpMessage[]>(`/api/exercises/${exerciseId}/help`);
}

export function getExerciseAttempts(exerciseId: string): Promise<{ failedAttempts: number }> {
  return request<{ failedAttempts: number }>(`/api/exercises/${exerciseId}/attempts`);
}

export function askExerciseHelp(
  exerciseId: string,
  question: string,
  code: string,
): Promise<ExerciseHelpMessage[]> {
  return request<ExerciseHelpMessage[]>(`/api/exercises/${exerciseId}/help`, {
    method: 'POST',
    body: JSON.stringify({ question, code }),
  });
}

export function analyzeExecutionResult(
  exerciseId: string,
  code: string,
  executionResult: ExecutionResult,
): Promise<ExerciseHelpMessage[]> {
  return request<ExerciseHelpMessage[]>(`/api/exercises/${exerciseId}/analyze-result`, {
    method: 'POST',
    body: JSON.stringify({ code, executionResult }),
  });
}

// The answer key (correctAnswer/gradingNotes) is never sent to the client.
export interface ClientExamQuestion {
  id: string;
  sessionId: string;
  questionMd: string;
  questionType: QuestionType;
  choices: string[] | null;
}

export function getExamQuestions(sessionId: string): Promise<ClientExamQuestion[]> {
  return request<ClientExamQuestion[]>(`/api/sessions/${sessionId}/exam/questions`);
}

interface SubmitExamApiResponse {
  examAttempt: ExamAttempt;
  masteryRecord: MasteryRecord;
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
}

export async function submitExamAnswers(
  sessionId: string,
  answers: Record<string, string>,
): Promise<SubmitResult<ExamAttempt>> {
  const response = await request<SubmitExamApiResponse>(`/api/sessions/${sessionId}/exam/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
  const { examAttempt, ...rest } = response;
  return { ...rest, result: examAttempt };
}

export interface TeachOnDemandResult {
  topic: Topic;
  session: StudySession;
  examQuestions: ClientExamQuestion[];
}

export function teachOnDemand(topic: string): Promise<TeachOnDemandResult> {
  return request<TeachOnDemandResult>('/api/teach', {
    method: 'POST',
    body: JSON.stringify({ topic }),
  });
}

export function getOverview(): Promise<LearningOverview> {
  return request<LearningOverview>('/api/overview');
}

export function refreshOverview(): Promise<LearningOverview> {
  return request<LearningOverview>('/api/overview/refresh', { method: 'POST' });
}

export function getSettings(): Promise<AiSettings> {
  return request<AiSettings>('/api/settings');
}

export function updateSettings(provider: string): Promise<AiSettings> {
  return request<AiSettings>('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}
