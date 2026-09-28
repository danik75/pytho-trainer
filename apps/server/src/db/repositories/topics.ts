import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Topic } from '@pytho-trainer/shared';

interface TopicRow {
  id: string;
  track_id: string;
  origin: Topic['origin'];
  order_index: number;
  title: string;
  description: string;
  learning_objectives: string;
  prerequisite_topic_ids: string;
  difficulty: Topic['difficulty'];
  created_at: string;
}

function mapRow(row: TopicRow): Topic {
  return {
    id: row.id,
    trackId: row.track_id,
    origin: row.origin,
    orderIndex: row.order_index,
    title: row.title,
    description: row.description,
    learningObjectives: JSON.parse(row.learning_objectives) as string[],
    prerequisiteTopicIds: JSON.parse(row.prerequisite_topic_ids) as string[],
    difficulty: row.difficulty,
    createdAt: row.created_at,
  };
}

export interface InsertTopicInput {
  trackId: string;
  origin?: Topic['origin'];
  orderIndex: number;
  title: string;
  description: string;
  learningObjectives: string[];
  prerequisiteTopicIds?: string[];
  difficulty: Topic['difficulty'];
}

export function insertTopic(db: Database.Database, input: InsertTopicInput): Topic {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO topics (id, track_id, origin, order_index, title, description, learning_objectives, prerequisite_topic_ids, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.trackId,
    input.origin ?? 'roadmap',
    input.orderIndex,
    input.title,
    input.description,
    JSON.stringify(input.learningObjectives),
    JSON.stringify(input.prerequisiteTopicIds ?? []),
    input.difficulty,
  );

  return mapRow(db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as TopicRow);
}

export function listTopicsByTrack(db: Database.Database, trackId: string): Topic[] {
  const rows = db
    .prepare('SELECT * FROM topics WHERE track_id = ? ORDER BY order_index ASC')
    .all(trackId) as TopicRow[];
  return rows.map(mapRow);
}

export function getTopic(db: Database.Database, topicId: string): Topic | null {
  const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as TopicRow | undefined;
  return row ? mapRow(row) : null;
}
