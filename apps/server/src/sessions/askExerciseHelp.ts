import type Database from 'better-sqlite3';
import type { ExerciseHelpMessage } from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { askExerciseQuestion } from '../ai/exerciseHelp';
import { getExercise } from '../db/repositories/exercises';
import {
  insertExerciseHelpMessage,
  listExerciseHelpMessages,
} from '../db/repositories/exerciseHelp';
import { NotFoundError } from '../errors';

/**
 * Answers a free-form question in the exercise's tutor-sidebar chat. The AI
 * only ever sees the exercise prompt, its concepts primer, the student's
 * current code, and the chat history - never the hidden tests - so it can't
 * leak expected test outputs while helping.
 */
export async function askExerciseHelp(
  db: Database.Database,
  aiClient: AiClient,
  exerciseId: string,
  question: string,
  currentCode: string,
): Promise<ExerciseHelpMessage[]> {
  const exercise = getExercise(db, exerciseId);
  if (!exercise) throw new NotFoundError(`Exercise ${exerciseId} not found`);

  const history = listExerciseHelpMessages(db, exerciseId);

  const { answer } = await askExerciseQuestion(aiClient, {
    exercisePrompt: exercise.prompt,
    conceptsMd: exercise.conceptsMd,
    currentCode,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    question,
  });

  const persist = db.transaction(() => {
    insertExerciseHelpMessage(db, { exerciseId, role: 'user', content: question });
    insertExerciseHelpMessage(db, { exerciseId, role: 'assistant', content: answer });
  });
  persist();

  return listExerciseHelpMessages(db, exerciseId);
}
