import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from './users';
import { insertCurriculum } from './curricula';
import { insertTrack } from './tracks';
import { insertTopic } from './topics';
import { insertStudySession } from './sessions';
import { insertExercise } from './exercises';
import {
  clearExerciseHelpMessages,
  insertExerciseHelpMessage,
  listExerciseHelpMessages,
} from './exerciseHelp';

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
    starterCode: '',
    conceptsMd: 'Functions are defined with `def`.',
    difficulty: 'intro',
    targetWeakSpots: [],
    hiddenTests: [],
  });
}

describe('exercise_help_messages repository', () => {
  it('starts with no messages for a fresh exercise', () => {
    const db = createTestDb();
    const exercise = setupExercise(db);

    expect(listExerciseHelpMessages(db, exercise.id)).toEqual([]);
  });

  it('inserts messages and lists them back in creation order', () => {
    const db = createTestDb();
    const exercise = setupExercise(db);

    const userMessage = insertExerciseHelpMessage(db, {
      exerciseId: exercise.id,
      role: 'user',
      content: 'What does def mean?',
    });
    const assistantMessage = insertExerciseHelpMessage(db, {
      exerciseId: exercise.id,
      role: 'assistant',
      content: 'It defines a function.',
    });

    const messages = listExerciseHelpMessages(db, exercise.id);
    expect(messages.map((m) => m.id)).toEqual([userMessage.id, assistantMessage.id]);
    expect(messages[0]).toMatchObject({ role: 'user', content: 'What does def mean?' });
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'It defines a function.' });
  });

  it('scopes messages to their own exercise', () => {
    const db = createTestDb();
    const exerciseA = setupExercise(db);
    const exerciseB = setupExercise(db);

    insertExerciseHelpMessage(db, { exerciseId: exerciseA.id, role: 'user', content: 'A' });

    expect(listExerciseHelpMessages(db, exerciseA.id)).toHaveLength(1);
    expect(listExerciseHelpMessages(db, exerciseB.id)).toEqual([]);
  });

  it("clears only the given exercise's messages", () => {
    const db = createTestDb();
    const exerciseA = setupExercise(db);
    const exerciseB = setupExercise(db);

    insertExerciseHelpMessage(db, { exerciseId: exerciseA.id, role: 'user', content: 'A' });
    insertExerciseHelpMessage(db, { exerciseId: exerciseB.id, role: 'user', content: 'B' });

    clearExerciseHelpMessages(db, exerciseA.id);

    expect(listExerciseHelpMessages(db, exerciseA.id)).toEqual([]);
    expect(listExerciseHelpMessages(db, exerciseB.id)).toHaveLength(1);
  });
});
