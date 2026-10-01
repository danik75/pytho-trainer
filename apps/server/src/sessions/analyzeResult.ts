import type Database from 'better-sqlite3';
import type { ExecutionResult, ExerciseHelpMessage } from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { analyzeExecutionResult } from '../ai/analyzeResult';
import { getExercise } from '../db/repositories/exercises';
import {
  insertExerciseHelpMessage,
  listExerciseHelpMessages,
} from '../db/repositories/exerciseHelp';
import { NotFoundError } from '../errors';

const ANALYZE_REQUEST_LABEL = 'Can you analyze this result and explain what happened?';

/**
 * Explains a Run/Submit result (stdout, stderr, test pass/fail) in the same
 * tutor-sidebar chat thread as askExerciseHelp, so the explanation and any
 * follow-up questions live in one continuous conversation. Unlike general
 * chat questions, the AI here is deliberately shown the test outcomes -
 * the student already sees them in the Results tab, so withholding them
 * from the explanation would make no sense.
 */
export async function analyzeResult(
  db: Database.Database,
  aiClient: AiClient,
  exerciseId: string,
  code: string,
  executionResult: ExecutionResult,
): Promise<ExerciseHelpMessage[]> {
  const exercise = getExercise(db, exerciseId);
  if (!exercise) throw new NotFoundError(`Exercise ${exerciseId} not found`);

  const history = listExerciseHelpMessages(db, exerciseId);

  const { answer } = await analyzeExecutionResult(aiClient, {
    exercisePrompt: exercise.prompt,
    conceptsMd: exercise.conceptsMd,
    code,
    stdout: executionResult.stdout,
    stderr: executionResult.stderr,
    timedOut: executionResult.timedOut,
    testResults: executionResult.testResults,
    history: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const persist = db.transaction(() => {
    insertExerciseHelpMessage(db, { exerciseId, role: 'user', content: ANALYZE_REQUEST_LABEL });
    insertExerciseHelpMessage(db, { exerciseId, role: 'assistant', content: answer });
  });
  persist();

  return listExerciseHelpMessages(db, exerciseId);
}
