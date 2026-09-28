import { z } from 'zod';
import { theoryGenerationSchema, type TheoryGeneration } from '@pytho-trainer/shared';
import { SONNET_MODEL, type AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  THEORY_SYSTEM_PROMPT,
  buildTheoryUserMessage,
  type TheoryGenerationInput,
} from './promptBuilders';

const TOOL_NAME = 'generate_theory_session';
const TOOL_DESCRIPTION =
  'Generate a theory session: an explanation of a concept plus a short exam (quiz) testing understanding of it.';
const JSON_SCHEMA = z.toJSONSchema(theoryGenerationSchema);

export async function generateTheorySession(
  aiClient: AiClient,
  input: TheoryGenerationInput,
): Promise<TheoryGeneration> {
  return generateStructured(aiClient, {
    system: THEORY_SYSTEM_PROMPT,
    userMessage: buildTheoryUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: theoryGenerationSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 4096,
    model: SONNET_MODEL,
  });
}
