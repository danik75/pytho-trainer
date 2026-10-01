import { createTestDb } from '../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import {
  insertRoadmapEntry,
  getRoadmapEntryByTopic,
  markRoadmapEntryMastered,
} from '../db/repositories/roadmap';
import { insertMasteryRecord, updateMasteryAfterEvaluation } from '../db/repositories/mastery';
import { InvalidStateError, NotFoundError } from '../errors';
import { resetTopic } from './resetTopic';

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

describe('resetTopic', () => {
  it('throws NotFoundError for an unknown topic', () => {
    const db = createTestDb();
    expect(() => resetTopic(db, 'missing')).toThrow(NotFoundError);
  });

  it('throws InvalidStateError for a topic with no roadmap entry', () => {
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
      title: 'On-demand',
      description: 'No roadmap entry',
      learningObjectives: ['n/a'],
      difficulty: 'intro',
    });
    expect(() => resetTopic(db, topic.id)).toThrow(InvalidStateError);
  });

  it('throws InvalidStateError for a locked topic', () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'locked');
    expect(() => resetTopic(db, topic.id)).toThrow(InvalidStateError);
  });

  it('throws InvalidStateError for a topic never started (still available)', () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'available');
    expect(() => resetTopic(db, topic.id)).toThrow(InvalidStateError);
  });

  it('resets a mastered topic back to available with wiped mastery', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'mastered');
    markRoadmapEntryMastered(db, topic.id);
    updateMasteryAfterEvaluation(db, topic.id, {
      masteryScore: 0.9,
      attemptsCount: 5,
      consecutiveSuccesses: 3,
      weakSpots: ['loops'],
      status: 'mastered',
    });

    const result = await resetTopic(db, topic.id);

    expect(result.mastery.masteryScore).toBe(0);
    expect(result.mastery.status).toBe('not_started');
    expect(result.roadmapEntry.status).toBe('available');
    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('available');
  });

  it('resets an in_progress topic back to available', async () => {
    const db = createTestDb();
    const topic = setupTopic(db, 'in_progress');

    const result = await resetTopic(db, topic.id);

    expect(result.roadmapEntry.status).toBe('available');
  });
});
