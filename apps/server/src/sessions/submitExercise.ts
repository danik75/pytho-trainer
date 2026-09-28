import type Database from 'better-sqlite3';
import type { Submission } from '@pytho-trainer/shared';
import { getExercise } from '../db/repositories/exercises';
import { insertSubmission } from '../db/repositories/submissions';
import { runSubmission, type SandboxConfig } from '../sandbox/runner';
import { NotFoundError } from '../errors';

/**
 * Executes a submission's code in the sandbox and persists the raw result.
 * AI evaluation of correctness/understanding is a separate step (Phase 4) -
 * this only records deterministic execution/test output.
 */
export async function submitExercise(
  db: Database.Database,
  sandboxConfig: SandboxConfig,
  exerciseId: string,
  code: string,
): Promise<Submission> {
  const exercise = getExercise(db, exerciseId);
  if (!exercise) throw new NotFoundError(`Exercise ${exerciseId} not found`);

  const execution = await runSubmission(code, exercise.hiddenTests, sandboxConfig);

  return insertSubmission(db, {
    exerciseId,
    code,
    stdout: execution.stdout,
    stderr: execution.stderr,
    exitCode: execution.exitCode,
    timedOut: execution.timedOut,
    testResults: execution.testResults,
  });
}
