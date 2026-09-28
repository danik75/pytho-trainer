import type Database from 'better-sqlite3';
import type { RoadmapEntry } from '@pytho-trainer/shared';
import { getActiveCurriculum } from '../db/repositories/curricula';
import { listTracksByCurriculum } from '../db/repositories/tracks';
import { listTopicsByTrack } from '../db/repositories/topics';
import { getMasteryRecordByTopic } from '../db/repositories/mastery';
import { listRoadmapByCurriculum } from '../db/repositories/roadmap';
import { ON_DEMAND_TRACK_LABEL, type TopicMasteryRow } from '../orchestration/learningOverview';

export interface LearningOverviewData {
  curriculumTitle: string;
  topicRows: TopicMasteryRow[];
  roadmapEntries: RoadmapEntry[];
}

/**
 * Gathers the raw rows the learning overview aggregation needs (all I/O,
 * intentionally free of any aggregation logic - see orchestration/learningOverview.ts
 * for the pure computation over these rows).
 */
export function gatherLearningOverviewData(
  db: Database.Database,
  userId: string,
): LearningOverviewData | null {
  const curriculum = getActiveCurriculum(db, userId);
  if (!curriculum) return null;

  const topicRows: TopicMasteryRow[] = [];
  for (const track of listTracksByCurriculum(db, curriculum.id)) {
    for (const topic of listTopicsByTrack(db, track.id)) {
      const mastery = getMasteryRecordByTopic(db, topic.id);
      topicRows.push({
        topicId: topic.id,
        title: topic.title,
        trackTitle: topic.origin === 'on_demand' ? ON_DEMAND_TRACK_LABEL : track.title,
        origin: topic.origin,
        masteryScore: mastery?.masteryScore ?? 0,
        attemptsCount: mastery?.attemptsCount ?? 0,
        status: mastery?.status ?? 'not_started',
        weakSpots: mastery?.weakSpots ?? [],
      });
    }
  }

  return {
    curriculumTitle: curriculum.title,
    topicRows,
    roadmapEntries: listRoadmapByCurriculum(db, curriculum.id),
  };
}
