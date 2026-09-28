import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ExerciseHelpMessage, ExerciseHelpRole } from '@pytho-trainer/shared';

interface ExerciseHelpMessageRow {
  id: string;
  exercise_id: string;
  role: ExerciseHelpRole;
  content: string;
  created_at: string;
}

function mapRow(row: ExerciseHelpMessageRow): ExerciseHelpMessage {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export interface InsertExerciseHelpMessageInput {
  exerciseId: string;
  role: ExerciseHelpRole;
  content: string;
}

export function insertExerciseHelpMessage(
  db: Database.Database,
  input: InsertExerciseHelpMessageInput,
): ExerciseHelpMessage {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO exercise_help_messages (id, exercise_id, role, content) VALUES (?, ?, ?, ?)`,
  ).run(id, input.exerciseId, input.role, input.content);
  return mapRow(
    db
      .prepare('SELECT * FROM exercise_help_messages WHERE id = ?')
      .get(id) as ExerciseHelpMessageRow,
  );
}

export function listExerciseHelpMessages(
  db: Database.Database,
  exerciseId: string,
): ExerciseHelpMessage[] {
  const rows = db
    .prepare('SELECT * FROM exercise_help_messages WHERE exercise_id = ? ORDER BY created_at ASC')
    .all(exerciseId) as ExerciseHelpMessageRow[];
  return rows.map(mapRow);
}
