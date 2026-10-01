import { z } from 'zod';
import { curriculumGenerationSchema, type CurriculumGeneration } from '@pytho-trainer/shared';
import { TIER_SMART, type AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  CURRICULUM_SYSTEM_PROMPT,
  buildCurriculumUserMessage,
  type CurriculumGenerationInput,
} from './promptBuilders';

const TOOL_NAME = 'generate_curriculum';
const TOOL_DESCRIPTION =
  'Generate a personalized Python curriculum: a Foundations track plus one track per selected domain, each with ordered topics.';
const JSON_SCHEMA = z.toJSONSchema(curriculumGenerationSchema);

export async function generateCurriculum(
  aiClient: AiClient,
  input: CurriculumGenerationInput,
): Promise<CurriculumGeneration> {
  return generateStructured(aiClient, {
    system: CURRICULUM_SYSTEM_PROMPT,
    userMessage: buildCurriculumUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: curriculumGenerationSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 8192,
    tier: TIER_SMART,
  });
}
