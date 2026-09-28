import type { CurriculumGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { persistGeneratedCurriculum } from './persistGeneratedCurriculum';
import { getRoadmapView } from './getRoadmapView';

const GENERATION: CurriculumGeneration = {
  title: 'Python Basics',
  summary: 'A gentle introduction.',
  tracks: [
    {
      kind: 'foundations',
      slug: 'foundations',
      title: 'Foundations',
      description: 'Core basics.',
      topics: [
        {
          title: 'Syntax',
          description: 'Python syntax basics.',
          learningObjectives: ['Write a script'],
          difficulty: 'intro',
        },
      ],
    },
  ],
};

describe('getRoadmapView', () => {
  it('returns null when the user has no active curriculum', () => {
    const db = createTestDb();
    ensureLocalUser(db);
    expect(getRoadmapView(db, LOCAL_USER_ID)).toBeNull();
  });

  it('composes tracks, topics, roadmap status, and mastery into one view', () => {
    const db = createTestDb();
    ensureLocalUser(db);
    persistGeneratedCurriculum(db, LOCAL_USER_ID, GENERATION);

    const view = getRoadmapView(db, LOCAL_USER_ID);
    expect(view?.title).toBe('Python Basics');
    expect(view?.tracks).toHaveLength(1);
    const topic = view?.tracks[0]?.topics[0];
    expect(topic?.title).toBe('Syntax');
    expect(topic?.roadmapStatus).toBe('available');
    expect(topic?.masteryStatus).toBe('not_started');
    expect(topic?.masteryScore).toBe(0);
  });

  it('falls back to locked/not_started for a topic with no roadmap entry or mastery record', () => {
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
    insertTopic(db, {
      trackId: track.id,
      orderIndex: 0,
      title: 'Orphan topic',
      description: 'No roadmap/mastery rows yet',
      learningObjectives: ['n/a'],
      difficulty: 'intro',
    });

    const view = getRoadmapView(db, LOCAL_USER_ID);
    const topic = view?.tracks[0]?.topics[0];
    expect(topic?.roadmapStatus).toBe('locked');
    expect(topic?.masteryStatus).toBe('not_started');
    expect(topic?.masteryScore).toBe(0);
  });
});
