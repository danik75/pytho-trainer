import type Database from 'better-sqlite3';
import type { RoadmapTopicView, RoadmapTrackView, RoadmapView } from '@pytho-trainer/shared';
import { getActiveCurriculum } from '../db/repositories/curricula';
import { listTracksByCurriculum } from '../db/repositories/tracks';
import { listTopicsByTrack } from '../db/repositories/topics';
import { getRoadmapEntryByTopic } from '../db/repositories/roadmap';
import { getMasteryRecordByTopic } from '../db/repositories/mastery';

export function getRoadmapView(db: Database.Database, userId: string): RoadmapView | null {
  const curriculum = getActiveCurriculum(db, userId);
  if (!curriculum) return null;

  const trackViews = listTracksByCurriculum(db, curriculum.id).map((track): RoadmapTrackView => ({
    trackId: track.id,
    kind: track.kind,
    title: track.title,
    description: track.description,
    topics: listTopicsByTrack(db, track.id).map((topic): RoadmapTopicView => {
      const roadmapEntry = getRoadmapEntryByTopic(db, topic.id);
      const mastery = getMasteryRecordByTopic(db, topic.id);
      return {
        topicId: topic.id,
        title: topic.title,
        description: topic.description,
        difficulty: topic.difficulty,
        roadmapStatus: roadmapEntry?.status ?? 'locked',
        masteryScore: mastery?.masteryScore ?? 0,
        masteryStatus: mastery?.status ?? 'not_started',
      };
    }),
  }));

  return {
    curriculumId: curriculum.id,
    title: curriculum.title,
    summary: curriculum.summary,
    tracks: trackViews,
  };
}
