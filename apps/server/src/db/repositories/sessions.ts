import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { StudySession } from '@pytho-trainer/shared';

interface StudySessionRow {
  id: string;
  topic_id: string;
  session_type: StudySession['sessionType'];
  session_number: number;
  explanation_md: string;
  status: StudySession['status'];
  created_at: string;
}

function mapRow(row: StudySessionRow): StudySession {
  return {
    id: row.id,
    topicId: row.topic_id,
    sessionType: row.session_type,
    sessionNumber: row.session_number,
    explanationMd: row.explanation_md,
    status: row.status,
    createdAt: row.created_at,
  };
}

export interface InsertStudySessionInput {
  topicId: string;
  sessionType: StudySession['sessionType'];
  sessionNumber: number;
  explanationMd?: string;
}

export function insertStudySession(
  db: Database.Database,
  input: InsertStudySessionInput,
): StudySession {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO study_sessions (id, topic_id, session_type, session_number, explanation_md)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.topicId, input.sessionType, input.sessionNumber, input.explanationMd ?? '');
  return mapRow(db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as StudySessionRow);
}

export function getStudySession(db: Database.Database, sessionId: string): StudySession | null {
  const row = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(sessionId) as
    StudySessionRow | undefined;
  return row ? mapRow(row) : null;
}

export function countSessionsForTopic(db: Database.Database, topicId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM study_sessions WHERE topic_id = ?')
    .get(topicId) as { count: number };
  return row.count;
}

export function getLatestSessionForTopic(
  db: Database.Database,
  topicId: string,
): StudySession | null {
  const row = db
    .prepare('SELECT * FROM study_sessions WHERE topic_id = ? ORDER BY session_number DESC LIMIT 1')
    .get(topicId) as StudySessionRow | undefined;
  return row ? mapRow(row) : null;
}
