import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ExamAttempt, ExamFeedback } from '@pytho-trainer/shared';

interface ExamAttemptRow {
  id: string;
  session_id: string;
  answers: string;
  score: number;
  ai_feedback: string | null;
  mastery_score_after: number | null;
  created_at: string;
}

function mapRow(row: ExamAttemptRow): ExamAttempt {
  return {
    id: row.id,
    sessionId: row.session_id,
    answers: JSON.parse(row.answers) as Record<string, string>,
    score: row.score,
    aiFeedback: row.ai_feedback
      ? (JSON.parse(row.ai_feedback) as ExamFeedback)
      : { overall: '', perQuestion: {} },
    masteryScoreAfter: row.mastery_score_after ?? 0,
    createdAt: row.created_at,
  };
}

export interface InsertExamAttemptInput {
  sessionId: string;
  answers: Record<string, string>;
  score: number;
  aiFeedback: ExamFeedback;
  masteryScoreAfter: number;
}

export function insertExamAttempt(
  db: Database.Database,
  input: InsertExamAttemptInput,
): ExamAttempt {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO exam_attempts (id, session_id, answers, score, ai_feedback, mastery_score_after)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.sessionId,
    JSON.stringify(input.answers),
    input.score,
    JSON.stringify(input.aiFeedback),
    input.masteryScoreAfter,
  );
  return mapRow(db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(id) as ExamAttemptRow);
}
