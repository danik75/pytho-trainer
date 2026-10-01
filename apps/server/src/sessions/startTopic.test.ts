import type { ExerciseGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertRoadmapEntry, getRoadmapEntryByTopic } from '../db/repositories/roadmap';
import { insertMasteryRecord, getMasteryRecordByTopic } from '../db/repositories/mastery';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { InvalidStateError, NotFoundError } from '../errors';
import { startTopic } from './startTopic';

const SAMPLE_EXERCISE: ExerciseGeneration = {
  prompt: 'Write a function that adds two numbers.',
  starterCode: 'def add(a, b):\n    pass\n',
  conceptsMd: '# Functions\n\nUse `def` to define a function.',
  difficulty: 'intro',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'adds', functionName: 'add', args: [2, 3], expected: 5 }],
  solutionCode: 'def add(a, b):\n    return a + b\n',
  solutionExplanationMd: 'Add the two parameters with `+` and return the result.',
};

function setupTopic(
  db: ReturnType<typeof createTestDb>,
  status: 'locked' | 'available' | 'in_progress' | 'mastered',
) {
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
  insertMasteryRecord(db, topic.id);
  insertRoadmapEntry(db, {
    curriculumId: curriculum.id,
    topicId: topic.id,
    sequenceIndex: 0,
    status,
  });
  return topic;
}

describe('startTopic', () => {
  it('throws NotFoundError for an unknown topic', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);
    await expect(startTopic(db, aiClient, 'missing')).rejects.toThrow(NotFoundError);
  });

  it('throws InvalidStateError for a locked topic', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'locked');
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);
    await expect(startTopic(db, aiClient, topic.id)).rejects.toThrow(InvalidStateError);
  });

  it('throws InvalidStateError for an already-mastered topic', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'mastered');
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);
    await expect(startTopic(db, aiClient, topic.id)).rejects.toThrow(InvalidStateError);
  });

  it('allows starting a topic with no roadmap entry at all, without a status transition', async () => {
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
      title: 'On-demand topic',
      description: 'No roadmap entry',
      learningObjectives: ['n/a'],
      difficulty: 'intro',
    });
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);

    const result = await startTopic(db, aiClient, topic.id);
    expect(result.exercise.prompt).toBe(SAMPLE_EXERCISE.prompt);
  });

  it('transitions an available topic to in_progress and generates its first exercise', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'available');
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);

    const result = await startTopic(db, aiClient, topic.id);

    expect(result.session.sessionNumber).toBe(1);
    expect(result.exercise.prompt).toBe(SAMPLE_EXERCISE.prompt);
    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('in_progress');
    expect(getMasteryRecordByTopic(db, topic.id)?.status).toBe('in_progress');
  });

  it('resumes the existing exercise session for an in_progress topic instead of generating a new one', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'in_progress');
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });
    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Already in progress - has unsaved student code',
      starterCode: 'def add(a, b):\n    pass\n',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);

    const result = await startTopic(db, aiClient, topic.id);

    expect(result.session.id).toBe(session.id);
    expect(result.exercise.id).toBe(exercise.id);
    expect(result.exercise.prompt).toBe('Already in progress - has unsaved student code');
    expect(aiClient.requests).toHaveLength(0);
  });

  it('generates a new exercise for an in_progress topic when the latest session is not an exercise', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'in_progress');
    insertStudySession(db, { topicId: topic.id, sessionType: 'theory', sessionNumber: 1 });
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);

    const result = await startTopic(db, aiClient, topic.id);

    expect(result.session.sessionNumber).toBe(2);
    expect(result.exercise.prompt).toBe(SAMPLE_EXERCISE.prompt);
  });
});
