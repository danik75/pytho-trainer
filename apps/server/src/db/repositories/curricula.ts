import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Curriculum } from '@pytho-trainer/shared';

interface CurriculumRow {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  status: Curriculum['status'];
  created_at: string;
}

function mapRow(row: CurriculumRow): Curriculum {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    createdAt: row.created_at,
  };
}

export interface InsertCurriculumInput {
  userId: string;
  title: string;
  summary: string;
  rawAiResponse: string;
}

export function insertCurriculum(db: Database.Database, input: InsertCurriculumInput): Curriculum {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO curricula (id, user_id, title, summary, raw_ai_response, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
  ).run(id, input.userId, input.title, input.summary, input.rawAiResponse);

  return mapRow(db.prepare('SELECT * FROM curricula WHERE id = ?').get(id) as CurriculumRow);
}

export function getActiveCurriculum(db: Database.Database, userId: string): Curriculum | null {
  const row = db
    .prepare(
      "SELECT * FROM curricula WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId) as CurriculumRow | undefined;
  return row ? mapRow(row) : null;
}
