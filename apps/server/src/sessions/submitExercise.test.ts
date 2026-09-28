const mockExeca = jest.fn();
jest.mock('execa', () => ({ execa: mockExeca }), { virtual: true });

import { createTestDb } from '../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { NotFoundError } from '../errors';
import { submitExercise } from './submitExercise';

const SANDBOX_CONFIG = { image: 'pytho-trainer-sandbox', timeoutMs: 5000, memoryMb: 128 };

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
    description: 'Defining functions',
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
    difficulty: 'intro',
    targetWeakSpots: [],
    hiddenTests: [{ name: 'adds', functionName: 'add', args: [2, 3], expected: 5 }],
  });
}

describe('submitExercise', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('throws NotFoundError for an unknown exercise', async () => {
    const db = createTestDb();
    await expect(submitExercise(db, SANDBOX_CONFIG, 'missing', 'pass')).rejects.toThrow(
      NotFoundError,
    );
    expect(mockExeca).not.toHaveBeenCalled();
  });

  it('runs the sandbox and persists the resulting submission', async () => {
    const db = createTestDb();
    const exercise = setupExercise(db);
    const payload = { stdout: '', stderr: '', testResults: [{ name: 'adds', passed: true }] };
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify(payload)}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });

    const submission = await submitExercise(
      db,
      SANDBOX_CONFIG,
      exercise.id,
      'def add(a, b):\n    return a + b\n',
    );

    expect(submission.exerciseId).toBe(exercise.id);
    expect(submission.testResults).toEqual(payload.testResults);
    expect(submission.aiEvaluation).toBeNull();
  });
});
