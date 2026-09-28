export type TrackKind = 'foundations' | 'domain';

export type TopicOrigin = 'roadmap' | 'on_demand';

export type Difficulty = 'intro' | 'core' | 'advanced';

export type RoadmapStatus = 'locked' | 'available' | 'in_progress' | 'mastered';

export type MasteryStatus = 'not_started' | 'in_progress' | 'mastered' | 'struggling';

export type SessionType = 'theory' | 'exercise';

export type SessionStatus = 'active' | 'completed';

export type QuestionType = 'multiple_choice' | 'short_answer';

export type SessionDecision =
  'next_exercise' | 'advance_topic' | 'insert_theory_session' | 'flag_struggling';

export type MasteryLevel = 'not_started' | 'developing' | 'proficient' | 'mastered';

export interface User {
  id: string;
  goals: string;
  selfAssessedLevel: string;
  diagnosticNotes: Record<string, unknown>;
  selectedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Curriculum {
  id: string;
  userId: string;
  title: string;
  summary: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
}

export interface Track {
  id: string;
  curriculumId: string;
  kind: TrackKind;
  slug: string;
  title: string;
  description: string;
  trackOrder: number;
}

export interface Topic {
  id: string;
  trackId: string;
  origin: TopicOrigin;
  orderIndex: number;
  title: string;
  description: string;
  learningObjectives: string[];
  prerequisiteTopicIds: string[];
  difficulty: Difficulty;
  createdAt: string;
}

export interface RoadmapEntry {
  id: string;
  curriculumId: string;
  topicId: string;
  sequenceIndex: number;
  status: RoadmapStatus;
  unlockedAt: string | null;
  masteredAt: string | null;
}

export interface MasteryRecord {
  id: string;
  topicId: string;
  masteryScore: number;
  attemptsCount: number;
  consecutiveSuccesses: number;
  weakSpots: string[];
  status: MasteryStatus;
  lastUpdatedAt: string;
}

export interface StudySession {
  id: string;
  topicId: string;
  sessionType: SessionType;
  sessionNumber: number;
  explanationMd: string;
  status: SessionStatus;
  createdAt: string;
}

export interface Exercise {
  id: string;
  sessionId: string;
  prompt: string;
  starterCode: string;
  difficulty: Difficulty;
  targetWeakSpots: string[];
  hiddenTests: HiddenTestSpec[];
  createdAt: string;
}

export interface HiddenTestSpec {
  name: string;
  functionName: string;
  args: unknown[];
  expected: unknown;
}

export interface Submission {
  id: string;
  exerciseId: string;
  code: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  testResults: TestResult[];
  aiEvaluation: SubmissionEvaluation | null;
  masteryScoreAfter: number | null;
  createdAt: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export interface SubmissionEvaluation {
  correct: boolean;
  understandingNotes: string;
  feedback: string;
  suggestedMasteryScore: number;
  identifiedWeakSpots: string[];
}

export interface ExamQuestion {
  id: string;
  sessionId: string;
  questionMd: string;
  questionType: QuestionType;
  choices: string[] | null;
  correctAnswer: string;
  gradingNotes: string;
}

export interface ExamAttempt {
  id: string;
  sessionId: string;
  answers: Record<string, string>;
  score: number;
  aiFeedback: ExamFeedback;
  masteryScoreAfter: number;
  createdAt: string;
}

export interface ExamFeedback {
  overall: string;
  perQuestion: Record<string, string>;
}

export interface LearningOverviewTopicSummary {
  topicId: string;
  title: string;
  trackTitle: string;
  masteryScore: number;
  level: MasteryLevel;
  attemptsCount: number;
  status: MasteryStatus;
}

export interface LearningOverview {
  topics: LearningOverviewTopicSummary[];
  difficulties: Array<{ weakSpot: string; occurrences: number }>;
  strugglingTopics: LearningOverviewTopicSummary[];
  nextSteps: LearningOverviewTopicSummary[];
  narrativeMd: string | null;
  narrativeGeneratedAt: string | null;
}
