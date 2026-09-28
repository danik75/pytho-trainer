import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from './users';
import { insertCurriculum } from './curricula';
import { insertTrack, listTracksByCurriculum } from './tracks';
import { insertTopic, listTopicsByTrack, getTopic } from './topics';

describe('tracks and topics repositories', () => {
  it('inserts and lists tracks in track_order', () => {
    const db = createTestDb();
    ensureLocalUser(db);
    const curriculum = insertCurriculum(db, {
      userId: LOCAL_USER_ID,
      title: 'C',
      summary: 'S',
      rawAiResponse: '{}',
    });

    insertTrack(db, {
      curriculumId: curriculum.id,
      kind: 'domain',
      slug: 'ml',
      title: 'ML',
      description: 'D',
      trackOrder: 1,
    });
    insertTrack(db, {
      curriculumId: curriculum.id,
      kind: 'foundations',
      slug: 'foundations',
      title: 'Foundations',
      description: 'D',
      trackOrder: 0,
    });

    const tracks = listTracksByCurriculum(db, curriculum.id);
    expect(tracks.map((t) => t.kind)).toEqual(['foundations', 'domain']);
  });

  it('inserts a topic, defaults origin to roadmap, and round-trips JSON fields', () => {
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
      title: 'Variables',
      description: 'Basics',
      learningObjectives: ['Declare a variable'],
      difficulty: 'intro',
    });

    expect(topic.origin).toBe('roadmap');
    expect(topic.learningObjectives).toEqual(['Declare a variable']);
    expect(topic.prerequisiteTopicIds).toEqual([]);
    expect(getTopic(db, topic.id)?.title).toBe('Variables');
    expect(listTopicsByTrack(db, track.id)).toHaveLength(1);
    expect(getTopic(db, 'missing-id')).toBeNull();
  });
});
