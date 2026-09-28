import type Database from 'better-sqlite3';
import type { ExecutionResult } from '@pytho-trainer/shared';
import { getExercise } from '../db/repositories/exercises';
import { runSubmission, type SandboxConfig } from '../sandbox/runner';
import { NotFoundError } from '../errors';

/**
 * Runs code in the sandbox for quick, in-editor feedback: no AI evaluation,
 * no persisted submission, no mastery/roadmap update. This is what "Run"
 * calls (fast - one docker run), as opposed to "Submit" (the full graded
 * flow in submitExercise.ts, which also calls the AI).
 */
export async function runExerciseCode(
  db: Database.Database,
  sandboxConfig: SandboxConfig,
  exerciseId: string,
  code: string,
): Promise<ExecutionResult> {
  const exercise = getExercise(db, exerciseId);
  if (!exercise) throw new NotFoundError(`Exercise ${exerciseId} not found`);

  return runSubmission(code, exercise.hiddenTests, sandboxConfig);
}
