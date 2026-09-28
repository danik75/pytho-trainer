import { z } from 'zod';
import { exerciseHelpAnswerSchema, type ExerciseHelpAnswerGeneration } from '@pytho-trainer/shared';
import { HAIKU_MODEL, type AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  EXERCISE_HELP_SYSTEM_PROMPT,
  buildExerciseHelpUserMessage,
  type ExerciseHelpInput,
} from './promptBuilders';

const TOOL_NAME = 'answer_exercise_question';
const TOOL_DESCRIPTION =
  "Answer a student's question about the coding exercise they are currently working on.";
const JSON_SCHEMA = z.toJSONSchema(exerciseHelpAnswerSchema);

export async function askExerciseQuestion(
  aiClient: AiClient,
  input: ExerciseHelpInput,
): Promise<ExerciseHelpAnswerGeneration> {
  return generateStructured(aiClient, {
    system: EXERCISE_HELP_SYSTEM_PROMPT,
    userMessage: buildExerciseHelpUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: exerciseHelpAnswerSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 1536,
    model: HAIKU_MODEL,
  });
}
