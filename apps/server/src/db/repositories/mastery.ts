import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { MasteryRecord } from '@pytho-trainer/shared';

interface MasteryRecordRow {
  id: string;
  topic_id: string;
  mastery_score: number;
  attempts_count: number;
  consecutive_successes: number;
  weak_spots: string;
  status: MasteryRecord['status'];
  last_updated_at: string;
}

function mapRow(row: MasteryRecordRow): MasteryRecord {
  return {
    id: row.id,
    topicId: row.topic_id,
    masteryScore: row.mastery_score,
    attemptsCount: row.attempts_count,
    consecutiveSuccesses: row.consecutive_successes,
    weakSpots: JSON.parse(row.weak_spots) as string[],
    status: row.status,
    lastUpdatedAt: row.last_updated_at,
  };
}

export function insertMasteryRecord(db: Database.Database, topicId: string): MasteryRecord {
  const id = randomUUID();
  db.prepare('INSERT INTO mastery_records (id, topic_id) VALUES (?, ?)').run(id, topicId);
  return mapRow(
    db.prepare('SELECT * FROM mastery_records WHERE id = ?').get(id) as MasteryRecordRow,
  );
}

export function getMasteryRecordByTopic(
  db: Database.Database,
  topicId: string,
): MasteryRecord | null {
  const row = db.prepare('SELECT * FROM mastery_records WHERE topic_id = ?').get(topicId) as
    MasteryRecordRow | undefined;
  return row ? mapRow(row) : null;
}
