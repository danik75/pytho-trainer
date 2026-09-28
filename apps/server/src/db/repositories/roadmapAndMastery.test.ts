import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from './users';
import { insertCurriculum } from './curricula';
import { insertTrack } from './tracks';
import { insertTopic } from './topics';
import {
  insertRoadmapEntry,
  listRoadmapByCurriculum,
  getRoadmapEntryByTopic,
  markRoadmapEntryInProgress,
  markRoadmapEntryMastered,
  unlockNextRoadmapEntry,
} from './roadmap';
import {
  insertMasteryRecord,
  getMasteryRecordByTopic,
  markMasteryInProgress,
  updateMasteryAfterEvaluation,
} from './mastery';

function setupTopic(db: ReturnType<typeof createTestDb>) {
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
    title: 'Variables',
    description: 'Basics',
    learningObjectives: ['Declare a variable'],
    difficulty: 'intro',
  });
  return { curriculum, topic };
}

function setupTwoTopics(db: ReturnType<typeof createTestDb>) {
  const { curriculum, topic } = setupTopic(db);
  const track = insertTrack(db, {
    curriculumId: curriculum.id,
    kind: 'foundations',
    slug: 'foundations-2',
    title: 'Foundations',
    description: 'D',
    trackOrder: 0,
  });
  const nextTopic = insertTopic(db, {
    trackId: track.id,
    orderIndex: 1,
    title: 'Control Flow',
    description: 'Basics',
    learningObjectives: ['Write an if statement'],
    difficulty: 'intro',
  });
  return { curriculum, topic, nextTopic };
}

describe('roadmap repository', () => {
  it('defaults new entries to locked with no unlocked_at', () => {
    const db = createTestDb();
    const { curriculum, topic } = setupTopic(db);

    const entry = insertRoadmapEntry(db, {
      curriculumId: curriculum.id,
      topicId: topic.id,
      sequenceIndex: 0,
    });

    expect(entry.status).toBe('locked');
    expect(entry.unlockedAt).toBeNull();
    expect(listRoadmapByCurriculum(db, curriculum.id)).toHaveLength(1);
    expect(getRoadmapEntryByTopic(db, topic.id)?.id).toBe(entry.id);
  });

  it('sets unlocked_at when created directly as available', () => {
    const db = createTestDb();
    const { curriculum, topic } = setupTopic(db);

    const entry = insertRoadmapEntry(db, {
      curriculumId: curriculum.id,
      topicId: topic.id,
      sequenceIndex: 0,
      status: 'available',
    });

    expect(entry.status).toBe('available');
    expect(entry.unlockedAt).not.toBeNull();
  });

  it('marks an entry in_progress', () => {
    const db = createTestDb();
    const { curriculum, topic } = setupTopic(db);
    insertRoadmapEntry(db, { curriculumId: curriculum.id, topicId: topic.id, sequenceIndex: 0 });

    markRoadmapEntryInProgress(db, topic.id);

    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('in_progress');
  });

  it('marks an entry mastered with a mastered_at timestamp', () => {
    const db = createTestDb();
    const { curriculum, topic } = setupTopic(db);
    insertRoadmapEntry(db, { curriculumId: curriculum.id, topicId: topic.id, sequenceIndex: 0 });

    markRoadmapEntryMastered(db, topic.id);

    const entry = getRoadmapEntryByTopic(db, topic.id);
    expect(entry?.status).toBe('mastered');
    expect(entry?.masteredAt).not.toBeNull();
  });

  it('unlocks the next locked entry by sequence_index', () => {
    const db = createTestDb();
    const { curriculum, topic, nextTopic } = setupTwoTopics(db);
    insertRoadmapEntry(db, { curriculumId: curriculum.id, topicId: topic.id, sequenceIndex: 0 });
    insertRoadmapEntry(db, {
      curriculumId: curriculum.id,
      topicId: nextTopic.id,
      sequenceIndex: 1,
    });

    unlockNextRoadmapEntry(db, curriculum.id, 0);

    expect(getRoadmapEntryByTopic(db, nextTopic.id)?.status).toBe('available');
  });

  it('does nothing when there is no next entry', () => {
    const db = createTestDb();
    const { curriculum, topic } = setupTopic(db);
    insertRoadmapEntry(db, { curriculumId: curriculum.id, topicId: topic.id, sequenceIndex: 0 });

    expect(() => unlockNextRoadmapEntry(db, curriculum.id, 0)).not.toThrow();
  });

  it('does not re-lock or otherwise touch a next entry that is not locked', () => {
    const db = createTestDb();
    const { curriculum, topic, nextTopic } = setupTwoTopics(db);
    insertRoadmapEntry(db, { curriculumId: curriculum.id, topicId: topic.id, sequenceIndex: 0 });
    insertRoadmapEntry(db, {
      curriculumId: curriculum.id,
      topicId: nextTopic.id,
      sequenceIndex: 1,
      status: 'in_progress',
    });

    unlockNextRoadmapEntry(db, curriculum.id, 0);

    expect(getRoadmapEntryByTopic(db, nextTopic.id)?.status).toBe('in_progress');
  });
});

describe('mastery repository', () => {
  it('creates a mastery record defaulted to not_started', () => {
    const db = createTestDb();
    const { topic } = setupTopic(db);

    const record = insertMasteryRecord(db, topic.id);
    expect(record.status).toBe('not_started');
    expect(record.masteryScore).toBe(0);
    expect(getMasteryRecordByTopic(db, topic.id)?.id).toBe(record.id);
  });

  it('returns null for a topic without a mastery record', () => {
    const db = createTestDb();
    expect(getMasteryRecordByTopic(db, 'missing')).toBeNull();
  });

  it('marks a mastery record in_progress', () => {
    const db = createTestDb();
    const { topic } = setupTopic(db);
    insertMasteryRecord(db, topic.id);

    markMasteryInProgress(db, topic.id);

    expect(getMasteryRecordByTopic(db, topic.id)?.status).toBe('in_progress');
  });

  it('updates all fields after an evaluation', () => {
    const db = createTestDb();
    const { topic } = setupTopic(db);
    insertMasteryRecord(db, topic.id);

    const updated = updateMasteryAfterEvaluation(db, topic.id, {
      masteryScore: 0.85,
      attemptsCount: 3,
      consecutiveSuccesses: 2,
      weakSpots: ['recursion'],
      status: 'mastered',
    });

    expect(updated.masteryScore).toBe(0.85);
    expect(updated.attemptsCount).toBe(3);
    expect(updated.consecutiveSuccesses).toBe(2);
    expect(updated.weakSpots).toEqual(['recursion']);
    expect(updated.status).toBe('mastered');
  });
});
