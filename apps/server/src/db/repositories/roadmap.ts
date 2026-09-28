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
