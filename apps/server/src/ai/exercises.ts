import { z } from 'zod';
import { exerciseGenerationSchema, type ExerciseGeneration } from '@pytho-trainer/shared';
import type { AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  EXERCISE_SYSTEM_PROMPT,
  buildExerciseUserMessage,
  type ExerciseGenerationInput,
} from './promptBuilders';

const TOOL_NAME = 'generate_exercise';
const TOOL_DESCRIPTION =
  'Generate one Python coding exercise (prompt, starter code, and hidden tests) for the given topic.';
const JSON_SCHEMA = z.toJSONSchema(exerciseGenerationSchema);

export async function generateExercise(
  aiClient: AiClient,
  input: ExerciseGenerationInput,
): Promise<ExerciseGeneration> {
  return generateStructured(aiClient, {
    system: EXERCISE_SYSTEM_PROMPT,
    userMessage: buildExerciseUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: exerciseGenerationSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 4096,
  });
}
