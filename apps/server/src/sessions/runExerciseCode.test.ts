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
import { runExerciseCode } from './runExerciseCode';

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
    conceptsMd: 'Functions are defined with `def`.',
    difficulty: 'intro',
    targetWeakSpots: [],
    hiddenTests: [{ name: 'adds', functionName: 'add', args: [2, 3], expected: 5 }],
  });
}

describe('runExerciseCode', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('throws NotFoundError for an unknown exercise', async () => {
    const db = createTestDb();
    await expect(runExerciseCode(db, SANDBOX_CONFIG, 'missing', 'pass')).rejects.toThrow(
      NotFoundError,
    );
    expect(mockExeca).not.toHaveBeenCalled();
  });

  it('runs the code in the sandbox and returns raw results without persisting anything', async () => {
    const db = createTestDb();
    const exercise = setupExercise(db);
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify({
        stdout: '',
        stderr: '',
        testResults: [{ name: 'adds', passed: true }],
      })}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });

    const result = await runExerciseCode(
      db,
      SANDBOX_CONFIG,
      exercise.id,
      'def add(a, b):\n    return a + b\n',
    );

    expect(result.testResults).toEqual([{ name: 'adds', passed: true }]);
    expect(result.timedOut).toBe(false);
  });
});
