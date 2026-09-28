import type { CurriculumGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { listTracksByCurriculum } from '../db/repositories/tracks';
import { listTopicsByTrack } from '../db/repositories/topics';
import { listRoadmapByCurriculum } from '../db/repositories/roadmap';
import { getMasteryRecordByTopic } from '../db/repositories/mastery';
import { persistGeneratedCurriculum } from './persistGeneratedCurriculum';

const GENERATION: CurriculumGeneration = {
  title: 'Python for Backend Engineers',
  summary: 'Foundations plus backend-focused Python.',
  tracks: [
    // Deliberately listed with a domain track before foundations, to verify
    // persistence reorders foundations first regardless of AI output order.
    {
      kind: 'domain',
      slug: 'backend',
      title: 'Backend Development',
      description: 'Server-side Python.',
      topics: [
        {
          title: 'Building APIs',
          description: 'Intro to HTTP APIs.',
          learningObjectives: ['Build an endpoint'],
          difficulty: 'core',
        },
      ],
    },
    {
      kind: 'foundations',
      slug: 'foundations',
      title: 'Python Foundations',
      description: 'Core language basics.',
      topics: [
        {
          title: 'Variables and Types',
          description: 'Basic data types.',
          learningObjectives: ['Declare variables'],
          difficulty: 'intro',
        },
        {
          title: 'Control Flow',
          description: 'If/else and loops.',
          learningObjectives: ['Write a loop'],
          difficulty: 'intro',
        },
      ],
    },
  ],
};

describe('persistGeneratedCurriculum', () => {
  it('orders foundations first and unlocks only the very first topic overall', () => {
    const db = createTestDb();
    ensureLocalUser(db);

    const { curriculumId } = persistGeneratedCurriculum(db, LOCAL_USER_ID, GENERATION);

    const tracks = listTracksByCurriculum(db, curriculumId);
    expect(tracks.map((t) => t.kind)).toEqual(['foundations', 'domain']);

    const roadmap = listRoadmapByCurriculum(db, curriculumId);
    expect(roadmap).toHaveLength(3);
    expect(roadmap[0]?.status).toBe('available');
    expect(roadmap[1]?.status).toBe('locked');
    expect(roadmap[2]?.status).toBe('locked');

    const foundationsTrack = tracks.find((t) => t.kind === 'foundations');
    const foundationsTopics = listTopicsByTrack(db, foundationsTrack!.id);
    expect(foundationsTopics.map((t) => t.title)).toEqual(['Variables and Types', 'Control Flow']);

    for (const topic of foundationsTopics) {
      expect(getMasteryRecordByTopic(db, topic.id)).not.toBeNull();
    }
  });
});
