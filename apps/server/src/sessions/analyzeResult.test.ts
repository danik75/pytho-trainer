import type { ExecutionResult, ExerciseHelpAnswerGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { NotFoundError } from '../errors';
import { analyzeResult } from './analyzeResult';

const SAMPLE_ANSWER: ExerciseHelpAnswerGeneration = {
  answer: 'That NameError means `x` is never defined - did you mean to use the parameter `a`?',
};

const SAMPLE_RESULT: ExecutionResult = {
  stdout: '',
  stderr: "NameError: name 'x' is not defined",
  exitCode: 1,
  timedOut: false,
  testResults: [{ name: 'adds two numbers', passed: false, details: 'raised NameError' }],
};

function setupExercise(db: ReturnType<typeof createTestDb>) {
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
    description: 'Basics',
    learningObjectives: ['Define a function'],
    difficulty: 'intro',
  });
  const session = insertStudySession(db, {
    topicId: topic.id,
    sessionType: 'exercise',
    sessionNumber: 1,
  });
  return insertExercise(db, {
    sessionId: session.id,
    prompt: 'Write add(a, b)',
    starterCode: 'def add(a, b):\n    pass\n',
    conceptsMd: 'Functions are defined with `def`.',
    difficulty: 'intro',
    targetWeakSpots: [],
    hiddenTests: [],
  });
}

describe('analyzeResult', () => {
  it('throws NotFoundError for an unknown exercise', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient();
    await expect(
      analyzeResult(db, aiClient, 'missing', 'def add(a, b): return x', SAMPLE_RESULT),
    ).rejects.toThrow(NotFoundError);
  });

  it('persists a labeled request and the answer, and returns the full history', async () => {
    const db = createTestDb();
    const exercise = setupExercise(db);
    const aiClient = createFakeAiClient(SAMPLE_ANSWER);

    const messages = await analyzeResult(
      db,
      aiClient,
      exercise.id,
      'def add(a, b):\n    return x\n',
      SAMPLE_RESULT,
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'user' });
    expect(messages[0]?.content).toContain('analyze this result');
    expect(messages[1]).toMatchObject({ role: 'assistant', content: SAMPLE_ANSWER.answer });
    expect(aiClient.requests[0]?.messages[0]?.content).toContain(
      "NameError: name 'x' is not defined",
    );
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('raised NameError');
  });

  it('includes prior exercise-help messages as history', async () => {
    const db = createTestDb();
    const exercise = setupExercise(db);
    const aiClient = createFakeAiClient(SAMPLE_ANSWER);

    await analyzeResult(db, aiClient, exercise.id, 'def add(a, b):\n    return x\n', SAMPLE_RESULT);
    await analyzeResult(db, aiClient, exercise.id, 'def add(a, b):\n    return a + b\n', {
      ...SAMPLE_RESULT,
      stderr: '',
      testResults: [{ name: 'adds two numbers', passed: true }],
    });

    const secondRequest = aiClient.requests[1];
    expect(secondRequest?.messages[0]?.content).toContain(SAMPLE_ANSWER.answer);
  });
});
