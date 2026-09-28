import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Submission, SubmissionEvaluation, TestResult } from '@pytho-trainer/shared';

interface SubmissionRow {
  id: string;
  exercise_id: string;
  code: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  timed_out: number;
  test_results: string;
  ai_evaluation: string | null;
  mastery_score_after: number | null;
  created_at: string;
}

function mapRow(row: SubmissionRow): Submission {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    code: row.code,
    stdout: row.stdout,
    stderr: row.stderr,
    exitCode: row.exit_code,
    timedOut: Boolean(row.timed_out),
    testResults: JSON.parse(row.test_results) as TestResult[],
    aiEvaluation: row.ai_evaluation
      ? (JSON.parse(row.ai_evaluation) as SubmissionEvaluation)
      : null,
    masteryScoreAfter: row.mastery_score_after,
    createdAt: row.created_at,
  };
}

export interface InsertSubmissionInput {
  exerciseId: string;
  code: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  testResults: TestResult[];
  aiEvaluation?: SubmissionEvaluation;
  masteryScoreAfter?: number;
}

export function insertSubmission(db: Database.Database, input: InsertSubmissionInput): Submission {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO submissions (id, exercise_id, code, stdout, stderr, exit_code, timed_out, test_results, ai_evaluation, mastery_score_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.exerciseId,
    input.code,
    input.stdout,
    input.stderr,
    input.exitCode,
    input.timedOut ? 1 : 0,
    JSON.stringify(input.testResults),
    input.aiEvaluation ? JSON.stringify(input.aiEvaluation) : null,
    input.masteryScoreAfter ?? null,
  );
  return mapRow(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as SubmissionRow);
}
