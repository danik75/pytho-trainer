import type Database from 'better-sqlite3';
import type { CurriculumGeneration } from '@pytho-trainer/shared';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertRoadmapEntry } from '../db/repositories/roadmap';
import { insertMasteryRecord } from '../db/repositories/mastery';

export interface PersistedCurriculumResult {
  curriculumId: string;
}

/**
 * Persists a validated AI curriculum generation as a curriculum + tracks +
 * topics + roadmap + mastery records, in one transaction. Foundations topics
 * are sequenced first; only the very first topic overall starts "available"
 * (unlocked) - everything else, including all domain tracks, starts "locked"
 * until the mastery engine unlocks it.
 */
export function persistGeneratedCurriculum(
  db: Database.Database,
  userId: string,
  generation: CurriculumGeneration,
): PersistedCurriculumResult {
  const persist = db.transaction(() => {
    const curriculum = insertCurriculum(db, {
      userId,
      title: generation.title,
      summary: generation.summary,
      rawAiResponse: JSON.stringify(generation),
    });

    const orderedTracks = [
      ...generation.tracks.filter((track) => track.kind === 'foundations'),
      ...generation.tracks.filter((track) => track.kind === 'domain'),
    ];

    let sequenceIndex = 0;
    let isFirstTopicOverall = true;

    for (const [trackIndex, trackGen] of orderedTracks.entries()) {
      const track = insertTrack(db, {
        curriculumId: curriculum.id,
        kind: trackGen.kind,
        slug: trackGen.slug,
        title: trackGen.title,
        description: trackGen.description,
        trackOrder: trackIndex,
      });

      for (const [topicIndex, topicGen] of trackGen.topics.entries()) {
        const topic = insertTopic(db, {
          trackId: track.id,
          orderIndex: topicIndex,
          title: topicGen.title,
          description: topicGen.description,
          learningObjectives: topicGen.learningObjectives,
          difficulty: topicGen.difficulty,
        });

        insertMasteryRecord(db, topic.id);
        insertRoadmapEntry(db, {
          curriculumId: curriculum.id,
          topicId: topic.id,
          sequenceIndex: sequenceIndex++,
          status: isFirstTopicOverall ? 'available' : 'locked',
        });
        isFirstTopicOverall = false;
      }
    }

    return { curriculumId: curriculum.id };
  });

  return persist();
}
