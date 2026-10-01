import type { ExerciseGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertRoadmapEntry, markRoadmapEntryMastered } from '../db/repositories/roadmap';
import { insertMasteryRecord, updateMasteryAfterEvaluation } from '../db/repositories/mastery';
import { getRoadmapEntryByTopic } from '../db/repositories/roadmap';
import { InvalidStateError, NotFoundError } from '../errors';
import { requestAdditionalPractice } from './requestAdditionalPractice';

const SAMPLE_EXERCISE: ExerciseGeneration = {
  prompt: 'A tougher challenge combining dicts and comprehensions.',
  starterCode: 'def solve(data):\n    pass\n',
  conceptsMd: '# Advanced patterns',
  difficulty: 'advanced',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'case1', functionName: 'solve', args: [{}], expected: {} }],
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
    title: 'Dictionaries',
    description: 'Working with dicts',
    learningObjectives: ['Use dict comprehensions'],
    difficulty: 'core',
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

describe('requestAdditionalPractice', () => {
  it('throws NotFoundError for an unknown topic', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);
    await expect(requestAdditionalPractice(db, aiClient, 'missing')).rejects.toThrow(NotFoundError);
  });

  it('throws InvalidStateError when the topic is not yet mastered', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'in_progress');
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);
    await expect(requestAdditionalPractice(db, aiClient, topic.id)).rejects.toThrow(
      InvalidStateError,
    );
  });

  it('generates a harder exercise and leaves the topic mastered', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'mastered');
    markRoadmapEntryMastered(db, topic.id);
    updateMasteryAfterEvaluation(db, topic.id, {
      masteryScore: 0.85,
      attemptsCount: 3,
      consecutiveSuccesses: 2,
      weakSpots: [],
      status: 'mastered',
    });
    const aiClient = createFakeAiClient(SAMPLE_EXERCISE);

    const result = await requestAdditionalPractice(db, aiClient, topic.id);

    expect(result.exercise.prompt).toBe(SAMPLE_EXERCISE.prompt);
    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('mastered');
    const request = aiClient.requests.find((r) => r.toolName === 'generate_exercise');
    expect(request?.messages[0]?.content).toContain('tougher challenge');
    expect(request?.messages[0]?.content).toContain('advanced');
  });
});
