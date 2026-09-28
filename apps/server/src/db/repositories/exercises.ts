import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Difficulty, Exercise, HiddenTestSpec } from '@pytho-trainer/shared';

interface ExerciseRow {
  id: string;
  session_id: string;
  prompt_md: string;
  starter_code: string;
  difficulty: Difficulty;
  target_weak_spots: string;
  hidden_tests: string;
  created_at: string;
}

function mapRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    prompt: row.prompt_md,
    starterCode: row.starter_code,
    difficulty: row.difficulty,
    targetWeakSpots: JSON.parse(row.target_weak_spots) as string[],
    hiddenTests: JSON.parse(row.hidden_tests) as HiddenTestSpec[],
    createdAt: row.created_at,
  };
}

export interface InsertExerciseInput {
  sessionId: string;
  prompt: string;
  starterCode: string;
  difficulty: Difficulty;
  targetWeakSpots: string[];
  hiddenTests: HiddenTestSpec[];
  rawAiResponse?: string;
}

export function insertExercise(db: Database.Database, input: InsertExerciseInput): Exercise {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO exercises (id, session_id, prompt_md, starter_code, difficulty, target_weak_spots, hidden_tests, raw_ai_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.sessionId,
    input.prompt,
    input.starterCode,
    input.difficulty,
    JSON.stringify(input.targetWeakSpots),
    JSON.stringify(input.hiddenTests),
    input.rawAiResponse ?? null,
  );
  return mapRow(db.prepare('SELECT * FROM exercises WHERE id = ?').get(id) as ExerciseRow);
}

export function getExercise(db: Database.Database, exerciseId: string): Exercise | null {
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId) as
    ExerciseRow | undefined;
  return row ? mapRow(row) : null;
}

export function getLatestExerciseBySession(
  db: Database.Database,
  sessionId: string,
): Exercise | null {
  const row = db
    .prepare('SELECT * FROM exercises WHERE session_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(sessionId) as ExerciseRow | undefined;
  return row ? mapRow(row) : null;
}

export function listExercisesBySession(db: Database.Database, sessionId: string): Exercise[] {
  const rows = db
    .prepare('SELECT * FROM exercises WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as ExerciseRow[];
  return rows.map(mapRow);
}
