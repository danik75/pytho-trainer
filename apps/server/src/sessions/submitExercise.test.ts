const mockExeca = jest.fn();
jest.mock('execa', () => ({ execa: mockExeca }), { virtual: true });

import type {
  ExerciseGeneration,
  SubmissionEvaluationGeneration,
  TheoryGeneration,
} from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { insertMasteryRecord, getMasteryRecordByTopic } from '../db/repositories/mastery';
import { insertRoadmapEntry, getRoadmapEntryByTopic } from '../db/repositories/roadmap';
import { NotFoundError } from '../errors';
import { MASTERY_THRESHOLD } from '../orchestration/sessionEngine';
import { submitExercise } from './submitExercise';

const SANDBOX_CONFIG = { image: 'pytho-trainer-sandbox', timeoutMs: 5000, memoryMb: 128 };

const PASSING_PAYLOAD = {
  stdout: '',
  stderr: '',
  testResults: [{ name: 'adds', passed: true }],
};

const CORRECT_EVALUATION: SubmissionEvaluationGeneration = {
  correct: true,
  understandingNotes: 'Good.',
  feedback: 'Nice work!',
  suggestedMasteryScore: 0.95,
  identifiedWeakSpots: [],
};

const NEXT_EXERCISE: ExerciseGeneration = {
  prompt: 'A second exercise.',
  starterCode: '',
  difficulty: 'intro',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'adds2', functionName: 'add', args: [1, 1], expected: 2 }],
};

const THEORY_SESSION: TheoryGeneration = {
  explanationMd: '# Functions, revisited',
  examQuestions: [
    {
      questionMd: 'What does `return` do?',
      questionType: 'short_answer',
      choices: null,
      correctAnswer: 'Sends a value back to the caller.',
      gradingNotes: 'Accept any description of sending a value back to the caller.',
    },
  ],
};

function setupCurriculum(db: ReturnType<typeof createTestDb>) {
  ensureLocalUser(db);
  const curriculum = insertCurriculum(db, {
    userId: LOCAL_USER_ID,
    title: 'C',
    summary: 'S',
    rawAiResponse: '{}',
  });
  const track = insertTrack(db, {
    curriculumId: curriculum.id,
    kind: 'foundations',
    slug: 'foundations',
    title: 'Foundations',
    description: 'D',
    trackOrder: 0,
  });
  const topic = insertTopic(db, {
    trackId: track.id,
    orderIndex: 0,
    title: 'Functions',
    description: 'Defining functions',
    learningObjectives: ['Define a function'],
    difficulty: 'intro',
  });
  const nextTopic = insertTopic(db, {
    trackId: track.id,
    orderIndex: 1,
    title: 'Loops',
    description: 'For and while loops',
    learningObjectives: ['Write a loop'],
    difficulty: 'intro',
  });
  insertMasteryRecord(db, topic.id);
  insertMasteryRecord(db, nextTopic.id);
  insertRoadmapEntry(db, {
    curriculumId: curriculum.id,
    topicId: topic.id,
    sequenceIndex: 0,
    status: 'in_progress',
  });
  insertRoadmapEntry(db, {
    curriculumId: curriculum.id,
    topicId: nextTopic.id,
    sequenceIndex: 1,
    status: 'locked',
  });
  const session = insertStudySession(db, {
    topicId: topic.id,
    sessionType: 'exercise',
    sessionNumber: 1,
  });
  const exercise = insertExercise(db, {
    sessionId: session.id,
    prompt: 'Write add(a, b)',
    starterCode: 'def add(a, b):\n    pass\n',
    difficulty: 'intro',
    targetWeakSpots: [],
    hiddenTests: [{ name: 'adds', functionName: 'add', args: [2, 3], expected: 5 }],
  });
  return { topic, nextTopic, session, exercise };
}

describe('submitExercise', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('throws NotFoundError for an unknown exercise', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient();
    await expect(submitExercise(db, aiClient, SANDBOX_CONFIG, 'missing', 'pass')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('generates and persists a next exercise when the topic is not yet mastered', async () => {
    const db = createTestDb();
    const { session, exercise } = setupCurriculum(db);
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify(PASSING_PAYLOAD)}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    const aiClient = createFakeAiClient();
    aiClient.enqueue(CORRECT_EVALUATION);
    aiClient.enqueue(NEXT_EXERCISE);

    const result = await submitExercise(
      db,
      aiClient,
      SANDBOX_CONFIG,
      exercise.id,
      'def add(a, b):\n    return a + b\n',
    );

    expect(result.decision).toBe('next_exercise');
    expect(result.nextExercise?.prompt).toBe(NEXT_EXERCISE.prompt);
    expect(result.submission.aiEvaluation).toEqual(CORRECT_EVALUATION);
    expect(result.masteryRecord.status).toBe('in_progress');

    expect(result.nextExercise?.sessionId).toBe(session.id);
    const exerciseToolCall = aiClient.requests.find((r) => r.toolName === 'generate_exercise');
    expect(exerciseToolCall?.messages[0]?.content).toContain('Write add(a, b)');
  });

  it('throws NotFoundError when the topic has no mastery record yet', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    const curriculum = insertCurriculum(db, {
      userId: LOCAL_USER_ID,
      title: 'C',
      summary: 'S',
      rawAiResponse: '{}',
    });
    const track = insertTrack(db, {
      curriculumId: curriculum.id,
      kind: 'foundations',
      slug: 'foundations',
      title: 'Foundations',
      description: 'D',
      trackOrder: 0,
    });
    const topic = insertTopic(db, {
      trackId: track.id,
      orderIndex: 0,
      title: 'Functions',
      description: 'Defining functions',
      learningObjectives: ['Define a function'],
      difficulty: 'intro',
    });
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });
    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Write add(a, b)',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });
    const aiClient = createFakeAiClient();

    await expect(submitExercise(db, aiClient, SANDBOX_CONFIG, exercise.id, 'pass')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('flags the topic struggling once the max-attempts safety valve is hit, without touching the roadmap', async () => {
    const db = createTestDb();
    const { topic, exercise } = setupCurriculum(db);
    const failingPayload = {
      stdout: '',
      stderr: '',
      testResults: [{ name: 'adds', passed: false, details: 'wrong' }],
    };
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify(failingPayload)}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    // suggestedMasteryScore stays above the "bad first attempt" theory-session
    // trigger (0.3) and identifiedWeakSpots stays empty so no repeated-weak-spot
    // trigger fires either - this test is specifically about the max-attempts
    // safety valve, not the theory-session insertion path (covered elsewhere).
    const wrongEvaluation: SubmissionEvaluationGeneration = {
      correct: false,
      understandingNotes: 'Not quite.',
      feedback: 'Try again.',
      suggestedMasteryScore: 0.5,
      identifiedWeakSpots: [],
    };

    const aiClient = createFakeAiClient();
    let currentExerciseId = exercise.id;
    let lastResult;
    for (let attempt = 0; attempt < MASTERY_THRESHOLD.maxAttemptsBeforeStruggling; attempt++) {
      aiClient.enqueue(wrongEvaluation);
      if (attempt < MASTERY_THRESHOLD.maxAttemptsBeforeStruggling - 1) {
        aiClient.enqueue(NEXT_EXERCISE);
      }
      lastResult = await submitExercise(db, aiClient, SANDBOX_CONFIG, currentExerciseId, 'wrong');
      currentExerciseId = lastResult.nextExercise?.id ?? currentExerciseId;
    }

    expect(lastResult?.decision).toBe('flag_struggling');
    expect(lastResult?.nextExercise).toBeNull();
    expect(getMasteryRecordByTopic(db, topic.id)?.status).toBe('struggling');
    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('in_progress');
  });

  it('inserts a theory session (in a new session) when the mastery engine decides to', async () => {
    const db = createTestDb();
    const { topic, session, exercise } = setupCurriculum(db);
    const failingPayload = {
      stdout: '',
      stderr: '',
      testResults: [{ name: 'adds', passed: false, details: 'wrong' }],
    };
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify(failingPayload)}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    const badEvaluation: SubmissionEvaluationGeneration = {
      correct: false,
      understandingNotes: 'No grasp of the concept yet.',
      feedback: 'Let’s go over this concept again.',
      suggestedMasteryScore: 0.1,
      identifiedWeakSpots: ['what functions return'],
    };
    const aiClient = createFakeAiClient();
    aiClient.enqueue(badEvaluation);
    aiClient.enqueue(THEORY_SESSION);

    const result = await submitExercise(db, aiClient, SANDBOX_CONFIG, exercise.id, 'wrong');

    expect(result.decision).toBe('insert_theory_session');
    expect(result.nextExercise).toBeNull();
    expect(result.theorySession?.session.sessionType).toBe('theory');
    expect(result.theorySession?.session.topicId).toBe(topic.id);
    expect(result.theorySession?.session.id).not.toBe(session.id);
    expect(result.theorySession?.examQuestions).toHaveLength(1);
    expect(getMasteryRecordByTopic(db, topic.id)?.status).toBe('in_progress');
  });

  it('advances the topic and unlocks the next roadmap entry once mastered', async () => {
    const db = createTestDb();
    const { topic, nextTopic, exercise } = setupCurriculum(db);
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify(PASSING_PAYLOAD)}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });
    const aiClient = createFakeAiClient();

    // First correct submission: consecutiveSuccesses=1, attempts=1 - not yet mastered.
    aiClient.enqueue(CORRECT_EVALUATION);
    aiClient.enqueue(NEXT_EXERCISE);
    const first = await submitExercise(
      db,
      aiClient,
      SANDBOX_CONFIG,
      exercise.id,
      'def add(a, b):\n    return a + b\n',
    );
    expect(first.decision).toBe('next_exercise');
    const secondExerciseId = first.nextExercise!.id;

    // Second correct submission: consecutiveSuccesses=2, attempts=2, score smoothed
    // up toward 0.95*0.6+0.95*0.4 - should cross the mastery threshold.
    aiClient.enqueue(CORRECT_EVALUATION);
    const second = await submitExercise(
      db,
      aiClient,
      SANDBOX_CONFIG,
      secondExerciseId,
      'def add(a, b):\n    return a + b\n',
    );

    expect(second.decision).toBe('advance_topic');
    expect(second.nextExercise).toBeNull();
    expect(getMasteryRecordByTopic(db, topic.id)?.status).toBe('mastered');
    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('mastered');
    expect(getRoadmapEntryByTopic(db, nextTopic.id)?.status).toBe('available');
  });
});
