import type { ExerciseHelpAnswerGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { NotFoundError } from '../errors';
import { askExerciseHelp } from './askExerciseHelp';

const SAMPLE_ANSWER: ExerciseHelpAnswerGeneration = {
  answer: 'Use `return a + b` to add the two parameters.',
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

describe('askExerciseHelp', () => {
  it('throws NotFoundError for an unknown exercise', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient();
    await expect(askExerciseHelp(db, aiClient, 'missing', 'help?', '')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('persists the question and answer, and returns the full history', async () => {
    const db = createTestDb();
    const exercise = setupExercise(db);
    const aiClient = createFakeAiClient(SAMPLE_ANSWER);

    const messages = await askExerciseHelp(
      db,
      aiClient,
      exercise.id,
      'How do I add the numbers?',
      'def add(a, b):\n    pass\n',
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'user', content: 'How do I add the numbers?' });
    expect(messages[1]).toMatchObject({ role: 'assistant', content: SAMPLE_ANSWER.answer });
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('Functions are defined with');
  });

  it('includes prior messages as history on a second question', async () => {
    const db = createTestDb();
    const exercise = setupExercise(db);
    const aiClient = createFakeAiClient(SAMPLE_ANSWER);

    await askExerciseHelp(db, aiClient, exercise.id, 'First question', '');
    await askExerciseHelp(db, aiClient, exercise.id, 'Second question', '');

    const secondRequest = aiClient.requests[1];
    expect(secondRequest?.messages[0]?.content).toContain('First question');
    expect(secondRequest?.messages[0]?.content).toContain(SAMPLE_ANSWER.answer);
    expect(secondRequest?.messages[0]?.content).toContain('Second question');
  });
});
