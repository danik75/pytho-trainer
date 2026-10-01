import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { RoadmapEntry } from '@pytho-trainer/shared';

interface RoadmapEntryRow {
  id: string;
  curriculum_id: string;
  topic_id: string;
  sequence_index: number;
  status: RoadmapEntry['status'];
  unlocked_at: string | null;
  mastered_at: string | null;
}

function mapRow(row: RoadmapEntryRow): RoadmapEntry {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    topicId: row.topic_id,
    sequenceIndex: row.sequence_index,
    status: row.status,
    unlockedAt: row.unlocked_at,
    masteredAt: row.mastered_at,
  };
}

export interface InsertRoadmapEntryInput {
  curriculumId: string;
  topicId: string;
  sequenceIndex: number;
  status?: RoadmapEntry['status'];
}

export function insertRoadmapEntry(
  db: Database.Database,
  input: InsertRoadmapEntryInput,
): RoadmapEntry {
  const id = randomUUID();
  const status = input.status ?? 'locked';
  const unlockedAt = status === 'available' ? new Date().toISOString() : null;

  db.prepare(
    `INSERT INTO roadmap_entries (id, curriculum_id, topic_id, sequence_index, status, unlocked_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.curriculumId, input.topicId, input.sequenceIndex, status, unlockedAt);

  return mapRow(
    db.prepare('SELECT * FROM roadmap_entries WHERE id = ?').get(id) as RoadmapEntryRow,
  );
}

export function listRoadmapByCurriculum(
  db: Database.Database,
  curriculumId: string,
): RoadmapEntry[] {
  const rows = db
    .prepare('SELECT * FROM roadmap_entries WHERE curriculum_id = ? ORDER BY sequence_index ASC')
    .all(curriculumId) as RoadmapEntryRow[];
  return rows.map(mapRow);
}

export function getRoadmapEntryByTopic(
  db: Database.Database,
  topicId: string,
): RoadmapEntry | null {
  const row = db.prepare('SELECT * FROM roadmap_entries WHERE topic_id = ?').get(topicId) as
    RoadmapEntryRow | undefined;
  return row ? mapRow(row) : null;
}

export function markRoadmapEntryInProgress(db: Database.Database, topicId: string): void {
  db.prepare("UPDATE roadmap_entries SET status = 'in_progress' WHERE topic_id = ?").run(topicId);
}

export function markRoadmapEntryMastered(db: Database.Database, topicId: string): void {
  db.prepare(
    "UPDATE roadmap_entries SET status = 'mastered', mastered_at = datetime('now') WHERE topic_id = ?",
  ).run(topicId);
}

/**
 * Reopens a topic (in_progress, struggling, or mastered) back to available
 * so it can be started fresh. Deliberately does not touch any other
 * roadmap entry - topics already unlocked because this one was mastered
 * stay unlocked, so resetting one topic never cascades into re-locking
 * progress made further down the roadmap.
 */
export function markRoadmapEntryAvailable(db: Database.Database, topicId: string): RoadmapEntry {
  db.prepare(
    "UPDATE roadmap_entries SET status = 'available', mastered_at = NULL WHERE topic_id = ?",
  ).run(topicId);
  return getRoadmapEntryByTopic(db, topicId) as RoadmapEntry;
}

/**
 * Unlocks the next entry in the curriculum's single flat sequence, if it's
 * still locked. Because persistGeneratedCurriculum already lays out
 * sequence_index as Foundations-then-domain-tracks-in-order, "next by
 * sequence_index" is sufficient to enforce Foundations-first and
 * sequential-domain-tracks gating without any track-aware branching here.
 */
export function unlockNextRoadmapEntry(
  db: Database.Database,
  curriculumId: string,
  currentSequenceIndex: number,
): void {
  const next = db
    .prepare(
      'SELECT * FROM roadmap_entries WHERE curriculum_id = ? AND sequence_index > ? ORDER BY sequence_index ASC LIMIT 1',
    )
    .get(curriculumId, currentSequenceIndex) as RoadmapEntryRow | undefined;

  if (next && next.status === 'locked') {
    db.prepare(
      "UPDATE roadmap_entries SET status = 'available', unlocked_at = datetime('now') WHERE id = ?",
    ).run(next.id);
  }
}
