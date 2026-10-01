import type Database from 'better-sqlite3';
import type { MasteryRecord, RoadmapEntry } from '@pytho-trainer/shared';
import { getTopic } from '../db/repositories/topics';
import { getRoadmapEntryByTopic, markRoadmapEntryAvailable } from '../db/repositories/roadmap';
import { resetMasteryRecord } from '../db/repositories/mastery';
import { InvalidStateError, NotFoundError } from '../errors';

export interface ResetTopicResult {
  mastery: MasteryRecord;
  roadmapEntry: RoadmapEntry;
}

/**
 * Wipes a topic's mastery progress and reopens it as available, so the
 * student can start it over from scratch. Deliberately leaves every other
 * topic's roadmap status untouched - see markRoadmapEntryAvailable.
 */
export function resetTopic(db: Database.Database, topicId: string): ResetTopicResult {
  const topic = getTopic(db, topicId);
  if (!topic) throw new NotFoundError(`Topic ${topicId} not found`);

  const roadmapEntry = getRoadmapEntryByTopic(db, topicId);
  if (!roadmapEntry || roadmapEntry.status === 'locked' || roadmapEntry.status === 'available') {
    throw new InvalidStateError(`Topic ${topicId} has not been started yet - nothing to reset`);
  }

  const reset = db.transaction(() => {
    const mastery = resetMasteryRecord(db, topicId);
    const updatedEntry = markRoadmapEntryAvailable(db, topicId);
    return { mastery, roadmapEntry: updatedEntry };
  });

  return reset();
}
